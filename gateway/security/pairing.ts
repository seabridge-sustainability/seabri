import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomInt, timingSafeEqual } from 'crypto'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'

const APPROVED_FILE = resolve(WORKSPACE_DIR, 'approved-senders.json')
const CODE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

const MAX_VERIFY_ATTEMPTS = 5

interface PairingCode {
  code: string
  createdAt: number
  attempts?: number
}

interface ApprovedSenders {
  approved: string[]
  pending: Record<string, PairingCode>
}

async function loadData(): Promise<ApprovedSenders> {
  try {
    const raw = await readFile(APPROVED_FILE, 'utf-8')
    return JSON.parse(raw) as ApprovedSenders
  } catch {
    return { approved: [], pending: {} }
  }
}

async function saveData(data: ApprovedSenders): Promise<void> {
  try {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    await writeFile(APPROVED_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // Non-fatal
  }
}

function generateCode(): string {
  return String(randomInt(100000, 1000000))
}

export async function isApproved(senderId: string): Promise<boolean> {
  const data = await loadData()
  return data.approved.includes(senderId)
}

export async function createPairingCode(senderId: string): Promise<string> {
  const data = await loadData()
  // Reuse existing unexpired code
  const existing = data.pending[senderId]
  if (existing && Date.now() - existing.createdAt < CODE_EXPIRY_MS) {
    return existing.code
  }
  const code = generateCode()
  data.pending[senderId] = { code, createdAt: Date.now() }
  await saveData(data)
  return code
}

export async function verifyPairingCode(senderId: string, code: string): Promise<boolean> {
  const data = await loadData()
  const pending = data.pending[senderId]
  if (!pending) return false
  if (Date.now() - pending.createdAt > CODE_EXPIRY_MS) {
    delete data.pending[senderId]
    await saveData(data)
    return false
  }
  const attempts = (pending.attempts ?? 0) + 1
  if (attempts > MAX_VERIFY_ATTEMPTS) {
    delete data.pending[senderId]
    await saveData(data)
    return false
  }
  const a = Buffer.from(pending.code)
  const b = Buffer.from(code)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    pending.attempts = attempts
    await saveData(data)
    return false
  }
  if (!data.approved.includes(senderId)) {
    data.approved.push(senderId)
  }
  delete data.pending[senderId]
  await saveData(data)
  return true
}

export async function approveSender(senderId: string): Promise<void> {
  const data = await loadData()
  if (!data.approved.includes(senderId)) {
    data.approved.push(senderId)
  }
  delete data.pending[senderId]
  await saveData(data)
}

export async function revokeSender(senderId: string): Promise<void> {
  const data = await loadData()
  data.approved = data.approved.filter((id) => id !== senderId)
  delete data.pending[senderId]
  await saveData(data)
}

export async function listApproved(): Promise<string[]> {
  const data = await loadData()
  return data.approved
}
