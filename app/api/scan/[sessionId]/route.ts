import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/scan-session-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const session = getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      images: session.images,
      imageCount: session.images.length
    })
  } catch (error) {
    console.error('[API] Error getting session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    )
  }
}
