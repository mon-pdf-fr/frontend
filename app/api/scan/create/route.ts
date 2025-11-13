import { NextResponse } from 'next/server'
import { createSession } from '@/lib/scan-session-store'

export async function POST() {
  try {
    const session = createSession()
    return NextResponse.json({
      success: true,
      sessionId: session.id
    })
  } catch (error) {
    console.error('[API] Error creating session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
