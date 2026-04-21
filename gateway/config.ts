import { config } from 'dotenv'
import { resolve } from 'path'
import { homedir } from 'os'

config({ path: resolve(process.cwd(), '.env') })

export const WORKSPACE_DIR = process.env.OPENSEABRI_WORKSPACE ||
  resolve(homedir(), '.openseabri', 'workspace')

export const CONFIG_FILE = resolve(homedir(), '.openseabri', 'openseabri.json')

export const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '18790', 10)
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
export const SEABRIDGE_API_URL = process.env.SEABRIDGE_API_URL || 'http://localhost:8000'
export const SEABRIDGE_API_KEY = process.env.SEABRIDGE_API_KEY || ''
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''
export const MODEL = process.env.OPENSEABRI_MODEL || 'claude-sonnet-4-5'

export const AGENTS = [
  { id: 'climate-risk', name: 'Climate Risk', icon: '🌊' },
  { id: 'nature-biodiversity', name: 'Nature & Biodiversity', icon: '🌿' },
  { id: 'sustainability-reporting', name: 'Sustainability Reporting', icon: '📋' },
  { id: 'investment-screening', name: 'Investment Risk Screening', icon: '🔍' },
  { id: 'home-community', name: 'Home & Community', icon: '🏠' },
  { id: 'net-zero', name: 'Net Zero & Decarbonization', icon: '🎯' },
  { id: 'natural-capital', name: 'Natural Capital & Land', icon: '🌾' },
  { id: 'general', name: 'General Sustainability', icon: '🌍' },
]
