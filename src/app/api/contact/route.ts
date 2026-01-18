import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  subject: z.string().min(1, 'Subject is required').max(50, 'Subject too long'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
})

type ContactSubmission = z.infer<typeof contactSchema>

const subjectLabels: Record<string, string> = {
  general: 'General Inquiry',
  support: 'Technical Support',
  privacy: 'Privacy Question',
  billing: 'Billing Question',
  feedback: 'Feedback or Suggestion',
  other: 'Other',
}

async function sendSlackNotification(data: ContactSubmission) {
  const webhookUrl = process.env.SLACK_CONTACT_WEBHOOK_URL || process.env.SLACK_WAITLIST_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('No Slack webhook configured for contact form, skipping notification')
    return
  }

  const subjectLabel = subjectLabels[data.subject] || data.subject

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📬 New Contact Form: ${subjectLabel}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*From:*\n${data.name}`
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n${data.email}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n${data.message}`
        }
      }
    ]
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })
  } catch (error) {
    console.error('Failed to send Slack notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const parseResult = contactSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      )
    }

    const body = parseResult.data

    // Send Slack notification
    await sendSlackNotification(body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
