/**
 * daemon/windows.ts
 *
 * Windows Service Control Manager (SCM) installer for the OpenSeaBri gateway.
 * Uses node-windows (optional native dep) so the module stays importable on
 * non-Windows platforms and degrades gracefully when the package is missing.
 *
 * Service name: OpenSeaBriGateway
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SERVICE_NAME = 'OpenSeaBriGateway'
const SERVICE_DESCRIPTION = 'OpenSeaBri gateway — sustainability intelligence service'

function gatewayEntryPoint(): string {
  return resolve(OPENSEABRI_ROOT, 'openseabri', 'gateway', 'index.js')
}

type NodeWindowsService = {
  on: (event: string, handler: (...args: unknown[]) => void) => void
  install: () => void
  uninstall: () => void
  start?: () => void
  exists?: boolean
}

type NodeWindowsModule = {
  Service: new (opts: {
    name: string
    description: string
    script: string
    nodeOptions?: string[]
    workingDirectory?: string
  }) => NodeWindowsService
}

async function loadNodeWindows(): Promise<NodeWindowsModule | null> {
  try {
    const spec = 'node-windows'
    const mod: unknown = await import(spec)
    const m = mod as { default?: NodeWindowsModule } & NodeWindowsModule
    return (m.default ?? m) as NodeWindowsModule
  } catch {
    return null
  }
}

function makeService(nw: NodeWindowsModule): NodeWindowsService {
  const script = gatewayEntryPoint()
  if (!existsSync(script)) {
    throw new Error(
      `Gateway entry point not found at ${script}. Build the gateway first (tsc) so that .js exists before installing the service.`,
    )
  }
  return new nw.Service({
    name: SERVICE_NAME,
    description: SERVICE_DESCRIPTION,
    script,
    workingDirectory: OPENSEABRI_ROOT,
  })
}

export async function installScm(): Promise<void> {
  const nw = await loadNodeWindows()
  if (!nw) {
    throw new Error(
      'node-windows is not installed. Install it with: npm install --save-optional node-windows',
    )
  }

  const svc = makeService(nw)
  await new Promise<void>((resolvePromise, rejectPromise) => {
    svc.on('install', () => {
      try {
        svc.start?.()
        console.log(`[Daemon] Installed Windows service "${SERVICE_NAME}"`)
        console.log('[Daemon] Gateway will start automatically at boot')
        resolvePromise()
      } catch (err) {
        rejectPromise(err)
      }
    })
    svc.on('alreadyinstalled', () => {
      console.log(`[Daemon] Service "${SERVICE_NAME}" is already installed`)
      resolvePromise()
    })
    svc.on('error', (err: unknown) => rejectPromise(err as Error))
    try {
      svc.install()
    } catch (err) {
      rejectPromise(err as Error)
    }
  })
}

export async function uninstallScm(): Promise<void> {
  const nw = await loadNodeWindows()
  if (!nw) {
    throw new Error(
      'node-windows is not installed. Cannot uninstall the service without the driver.',
    )
  }

  const svc = makeService(nw)
  await new Promise<void>((resolvePromise, rejectPromise) => {
    svc.on('uninstall', () => {
      console.log(`[Daemon] Removed Windows service "${SERVICE_NAME}"`)
      resolvePromise()
    })
    svc.on('error', (err: unknown) => rejectPromise(err as Error))
    try {
      svc.uninstall()
    } catch (err) {
      rejectPromise(err as Error)
    }
  })
}

export async function checkScmStatus(): Promise<{
  installed: boolean
  running: boolean
  configPath: string
}> {
  const nw = await loadNodeWindows()
  if (!nw) {
    return { installed: false, running: false, configPath: SERVICE_NAME }
  }

  try {
    const svc = makeService(nw)
    const installed = Boolean(svc.exists)
    let running = false
    if (installed) {
      try {
        const { execSync } = await import('node:child_process')
        const out = execSync(`sc query "${SERVICE_NAME}"`, { encoding: 'utf-8' })
        running = /STATE\s*:\s*\d+\s+RUNNING/.test(out)
      } catch {
        running = false
      }
    }
    return { installed, running, configPath: SERVICE_NAME }
  } catch {
    return { installed: false, running: false, configPath: SERVICE_NAME }
  }
}

export const WINDOWS_SERVICE_NAME = SERVICE_NAME
