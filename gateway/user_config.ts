import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { homedir } from 'os'

const CONFIG_DIR = resolve(homedir(), '.openseabri')
const CONFIG_PATH = resolve(CONFIG_DIR, 'openseabri.json')

export interface UserConfig {
  companyId?: string
  assetId?: string
  sector?: string
}

let cached: { config: UserConfig; loadedAt: number } | null = null
const CACHE_TTL_MS = 30_000

export async function loadUserConfig(force = false): Promise<UserConfig> {
  if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config
  }
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as UserConfig
    cached = { config: parsed, loadedAt: Date.now() }
    return parsed
  } catch {
    cached = { config: {}, loadedAt: Date.now() }
    return {}
  }
}

export async function saveUserConfig(config: UserConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  cached = { config, loadedAt: Date.now() }
}

export async function setUserConfigField(
  key: keyof UserConfig,
  value: string | undefined
): Promise<void> {
  const current = await loadUserConfig(true)
  if (value === undefined) {
    delete current[key]
  } else {
    current[key] = value
  }
  await saveUserConfig(current)
}
