/**
 * BaseChannel — the minimal contract every channel adapter implements.
 *
 * Codifies the pattern already used by cli.ts and telegram.ts:
 *   1. isEnabled() — cheap env/config check; returns false when token/config missing.
 *   2. start()    — dynamic-import SDK with graceful fallback if the package is absent;
 *                   wire inbound messages into shared_commands + agents/router.
 *   3. stop()     — optional; best-effort shutdown for long-lived channels.
 *
 * New channels (whatsapp, discord, slack, etc.) should conform to this shape so
 * gateway/index.ts can iterate `channels/registry.ts` uniformly.
 */

import type { Product } from '../product.js'

export interface BaseChannel {
  /** Stable identifier used in policy.channels[<id>] and logs. */
  readonly id: string

  /** Human-readable label for banners and `seabri doctor`. */
  readonly displayName: string

  /** Which product surface this channel serves. */
  readonly product: Product

  /**
   * True when required env/config is present. Does NOT verify the SDK package
   * is installed — that's handled inside start() via dynamic import.
   */
  isEnabled(): boolean

  /** Start the channel. Must not throw when SDK is missing — log and return. */
  start(): Promise<void>

  /** Optional clean shutdown. Callers should tolerate absence. */
  stop?(): Promise<void>
}

/**
 * Helper: swallow dynamic-import failures uniformly. Returns the module or null
 * when the package is not installed, and emits a standard warning.
 */
export async function tryImport<T = unknown>(
  pkg: string,
  channelId: string
): Promise<T | null> {
  try {
    const mod = (await import(pkg)) as T
    return mod
  } catch {
    console.warn(
      `[${channelId}] package '${pkg}' not installed. Run: npm install ${pkg}\n` +
        `[${channelId}] channel not started.`
    )
    return null
  }
}
