/**
 * integrations/manageesg/auth.ts
 *
 * AWS Cognito authentication helpers for OpenSeaBri → manageesg-backend.
 *
 * No dependency on the AWS SDK — uses the Cognito USER_SRP_AUTH HTTP flow
 * (documented at https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html)
 * via plain axios calls, so this module stays zero-extra-dependency.
 *
 * For SRP password auth we'd need a crypto helper — intentionally out of scope.
 * This module supports:
 *   - REFRESH_TOKEN_AUTH (rotate an existing refresh token into an access token)
 *   - Token validation / expiry decoding (no signature verification — that's the server's job)
 */

import axios from 'axios'

export interface CognitoConfig {
  region: string
  clientId: string
  userPoolId?: string
}

export interface CognitoTokens {
  accessToken: string
  idToken: string
  refreshToken?: string
  expiresAt: number
}

export function cognitoFromEnv(): CognitoConfig | null {
  const region = process.env.COGNITO_REGION
  const clientId = process.env.COGNITO_CLIENT_ID
  if (!region || !clientId) return null
  return {
    region,
    clientId,
    userPoolId: process.env.COGNITO_USER_POOL_ID,
  }
}

function cognitoEndpoint(region: string): string {
  return `https://cognito-idp.${region}.amazonaws.com/`
}

/**
 * Exchange a refresh token for a new access + id token pair.
 * Returns null if the refresh fails (expired, revoked, network error).
 */
export async function refreshCognitoTokens(
  config: CognitoConfig,
  refreshToken: string,
): Promise<CognitoTokens | null> {
  try {
    const { data } = await axios.post(
      cognitoEndpoint(config.region),
      {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: config.clientId,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      },
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        timeout: 10_000,
      },
    )
    const result = data?.AuthenticationResult
    if (!result?.AccessToken) return null
    return {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken ?? refreshToken,
      expiresAt: Date.now() + (result.ExpiresIn ?? 3600) * 1000,
    }
  } catch (err) {
    if (process.env.OPENSEABRI_DEBUG) {
      console.warn('[cognito] refresh failed:', err instanceof Error ? err.message : err)
    }
    return null
  }
}

/**
 * Decode a JWT's payload without verifying its signature.
 * Safe because we only ever use this for client-side expiry hints —
 * the backend still validates the token on every request.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token)
  if (!payload?.exp) return true
  return Date.now() / 1000 + skewSeconds >= payload.exp
}
