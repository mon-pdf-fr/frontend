// In-memory store for scan sessions
// Note: This will reset on server restart, but that's okay for short-lived scan sessions

interface ScanSession {
  id: string
  images: string[]
  createdAt: number
  lastActivity: number
}

const sessions = new Map<string, ScanSession>()

// Cleanup old sessions every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        sessions.delete(id)
        console.log(`[Scan] Cleaned up expired session: ${id}`)
      }
    }
  }, CLEANUP_INTERVAL)
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export function createSession(): ScanSession {
  const id = generateSessionId()
  const session: ScanSession = {
    id,
    images: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  }
  sessions.set(id, session)
  console.log(`[Scan] Created session: ${id}`)
  return session
}

export function getSession(id: string): ScanSession | null {
  const session = sessions.get(id)
  if (session) {
    session.lastActivity = Date.now()
    return session
  }
  return null
}

export function addImage(sessionId: string, imageData: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) {
    console.log(`[Scan] Session not found: ${sessionId}`)
    return false
  }

  session.images.push(imageData)
  session.lastActivity = Date.now()
  console.log(`[Scan] Added image to session ${sessionId}, total: ${session.images.length}`)
  return true
}

export function removeImage(sessionId: string, index: number): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  if (index >= 0 && index < session.images.length) {
    session.images.splice(index, 1)
    session.lastActivity = Date.now()
    console.log(`[Scan] Removed image from session ${sessionId}, remaining: ${session.images.length}`)
    return true
  }
  return false
}

export function deleteSession(id: string): void {
  sessions.delete(id)
  console.log(`[Scan] Deleted session: ${id}`)
}
