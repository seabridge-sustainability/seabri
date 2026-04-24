import { writeFile, mkdir, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DAEMON_DIR = resolve(dirname(fileURLToPath(import.meta.url)))

export interface DaemonStatus {
  installed: boolean
  running: boolean
  platform: NodeJS.Platform
  method: 'launchd' | 'systemd' | 'scm' | 'none'
  configPath?: string
}

function getGatewayEntryPoint(): string {
  return resolve(OPENSEABRI_ROOT, 'openseabri', 'gateway', 'index.js')
}

function getNodePath(): string {
  try {
    return execSync('which node', { encoding: 'utf-8' }).trim()
  } catch {
    return process.execPath
  }
}

async function installLaunchd(): Promise<void> {
  const plistTemplate = await readFile(resolve(DAEMON_DIR, 'com.openseabri.gateway.plist'), 'utf-8')
  const nodePath = getNodePath()
  const gatewayPath = getGatewayEntryPoint()

  const plist = plistTemplate
    .replace('{{NODE_PATH}}', nodePath)
    .replace('{{GATEWAY_PATH}}', gatewayPath)
    .replace('{{OPENSEABRI_ROOT}}', OPENSEABRI_ROOT)

  const plistDest = resolve(process.env.HOME ?? '~', 'Library', 'LaunchAgents', 'com.openseabri.gateway.plist')
  await mkdir(dirname(plistDest), { recursive: true })
  await writeFile(plistDest, plist, 'utf-8')

  execSync(`launchctl load "${plistDest}"`, { stdio: 'inherit' })
  console.log(`[Daemon] Installed launchd agent at ${plistDest}`)
  console.log('[Daemon] Gateway will start automatically on login')
}

async function installSystemd(): Promise<void> {
  const serviceTemplate = await readFile(resolve(DAEMON_DIR, 'openseabri-gateway.service'), 'utf-8')
  const nodePath = getNodePath()
  const gatewayPath = getGatewayEntryPoint()

  const service = serviceTemplate
    .replace('{{NODE_PATH}}', nodePath)
    .replace('{{GATEWAY_PATH}}', gatewayPath)
    .replace('{{OPENSEABRI_ROOT}}', OPENSEABRI_ROOT)
    .replace('{{USER}}', process.env.USER ?? 'user')

  const systemdUserDir = resolve(process.env.HOME ?? '~', '.config', 'systemd', 'user')
  await mkdir(systemdUserDir, { recursive: true })
  const serviceDest = resolve(systemdUserDir, 'openseabri-gateway.service')
  await writeFile(serviceDest, service, 'utf-8')

  execSync('systemctl --user daemon-reload', { stdio: 'inherit' })
  execSync('systemctl --user enable openseabri-gateway.service', { stdio: 'inherit' })
  execSync('systemctl --user start openseabri-gateway.service', { stdio: 'inherit' })
  console.log(`[Daemon] Installed systemd user service at ${serviceDest}`)
  console.log('[Daemon] Gateway will start automatically on login (loginctl enable-linger to survive logout)')
}

async function uninstallLaunchd(): Promise<void> {
  const plistDest = resolve(process.env.HOME ?? '~', 'Library', 'LaunchAgents', 'com.openseabri.gateway.plist')
  try {
    execSync(`launchctl unload "${plistDest}"`, { stdio: 'inherit' })
  } catch { /* already unloaded */ }

  const { unlink } = await import('fs/promises')
  try {
    await unlink(plistDest)
  } catch { /* already gone */ }

  console.log('[Daemon] Removed launchd agent')
}

async function uninstallSystemd(): Promise<void> {
  try {
    execSync('systemctl --user stop openseabri-gateway.service', { stdio: 'inherit' })
    execSync('systemctl --user disable openseabri-gateway.service', { stdio: 'inherit' })
  } catch { /* already stopped */ }

  const serviceDest = resolve(process.env.HOME ?? '~', '.config', 'systemd', 'user', 'openseabri-gateway.service')
  const { unlink } = await import('fs/promises')
  try {
    await unlink(serviceDest)
    execSync('systemctl --user daemon-reload', { stdio: 'inherit' })
  } catch { /* already gone */ }

  console.log('[Daemon] Removed systemd user service')
}

function checkLaunchdStatus(): DaemonStatus {
  const plistPath = resolve(process.env.HOME ?? '~', 'Library', 'LaunchAgents', 'com.openseabri.gateway.plist')
  let installed = false
  let running = false

  try {
    execSync(`test -f "${plistPath}"`)
    installed = true
  } catch { /* not installed */ }

  if (installed) {
    try {
      const result = execSync('launchctl list com.openseabri.gateway 2>/dev/null', { encoding: 'utf-8' })
      running = result.includes('PID')
    } catch { /* not running */ }
  }

  return { installed, running, platform: 'darwin', method: 'launchd', configPath: plistPath }
}

function checkSystemdStatus(): DaemonStatus {
  const servicePath = resolve(process.env.HOME ?? '~', '.config', 'systemd', 'user', 'openseabri-gateway.service')
  let installed = false
  let running = false

  try {
    execSync(`test -f "${servicePath}"`)
    installed = true
  } catch { /* not installed */ }

  if (installed) {
    try {
      const result = execSync('systemctl --user is-active openseabri-gateway.service 2>/dev/null', { encoding: 'utf-8' })
      running = result.trim() === 'active'
    } catch { /* not running */ }
  }

  return { installed, running, platform: 'linux', method: 'systemd', configPath: servicePath }
}

export async function installDaemon(): Promise<void> {
  if (process.platform === 'darwin') {
    await installLaunchd()
  } else if (process.platform === 'linux') {
    await installSystemd()
  } else if (process.platform === 'win32') {
    const { installScm } = await import('./windows.js')
    await installScm()
  } else {
    throw new Error(`Daemon installation not supported on ${process.platform}. Run the gateway manually: seabri gateway`)
  }
}

export async function uninstallDaemon(): Promise<void> {
  if (process.platform === 'darwin') {
    await uninstallLaunchd()
  } else if (process.platform === 'linux') {
    await uninstallSystemd()
  } else if (process.platform === 'win32') {
    const { uninstallScm } = await import('./windows.js')
    await uninstallScm()
  } else {
    throw new Error(`Daemon uninstallation not supported on ${process.platform}`)
  }
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  if (process.platform === 'darwin') {
    return checkLaunchdStatus()
  } else if (process.platform === 'linux') {
    return checkSystemdStatus()
  } else if (process.platform === 'win32') {
    const { checkScmStatus } = await import('./windows.js')
    const s = await checkScmStatus()
    return {
      installed: s.installed,
      running: s.running,
      platform: 'win32',
      method: 'scm',
      configPath: s.configPath,
    }
  }
  return { installed: false, running: false, platform: process.platform, method: 'none' }
}
