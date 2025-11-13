import { NextRequest, NextResponse } from 'next/server'
import { removeImage } from '@/lib/scan-session-store'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { index } = await request.json()

    if (typeof index !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid index' },
        { status: 400 }
      )
    }

    const success = removeImage(sessionId, index)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Session not found or invalid index' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error removing image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove image' },
      { status: 500 }
    )
  }
}
