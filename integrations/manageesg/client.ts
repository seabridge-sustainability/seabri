/**
 * integrations/manageesg/client.ts — REMOVED
 *
 * OpenSeaBri is a fully standalone product. It does not call the SeaBridgeAI
 * backend (manageesg-backend) under any circumstances.
 *
 * The ManageEsgClient class that previously lived here made HTTP requests to
 * /api/v1/esg-intelligence, /api/v1/world-risk, and /api/v1/sustainability-research
 * endpoints — routes that are outside the openseabri isolation boundary.
 * It has been removed to eliminate a latent activation path.
 *
 * If backend integration is ever needed in the future, scope it strictly to
 * /api/v1/openseabri/* and require explicit operator approval to re-enable.
 */

export {}
