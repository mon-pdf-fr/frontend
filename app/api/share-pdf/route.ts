import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const recipientEmail = formData.get('recipient') as string
    const message = formData.get('message') as string | null
    const platform = formData.get('platform') as string

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!recipientEmail && platform === 'email') {
      return NextResponse.json(
        { error: 'No recipient email provided' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (platform === 'email' && !emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Handle different platforms
    switch (platform) {
      case 'email':
        // Send email with PDF attachment using Resend
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Mon PDF <onboarding@resend.dev>',
          to: recipientEmail,
          subject: 'Shared PDF Document',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8b5cf6;">PDF Document Shared</h2>
              <p>${message || 'Someone has shared a PDF document with you.'}</p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Please find the attached PDF document.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">
                This email was sent from <strong>Mon PDF</strong> - Free Online PDF Tools
              </p>
            </div>
          `,
          attachments: [
            {
              filename: file.name,
              content: buffer,
            },
          ],
        })

        if (emailResult.error) {
          console.error('Resend error:', emailResult.error)
          return NextResponse.json(
            { error: 'Failed to send email. Please try again.' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Email sent successfully',
          id: emailResult.data?.id,
        })

      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Share PDF error:', error)
    return NextResponse.json(
      { error: 'Failed to share PDF. Please try again.' },
      { status: 500 }
    )
  }
}
