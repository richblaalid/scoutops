import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for inserting without RLS issues
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WaitlistSubmission {
  email: string
  name?: string
  unit_type?: string
  unit_size?: string
  current_software?: string
  current_payment_platform?: string
  biggest_pain_point?: string
  additional_info?: string
  referral_source?: string
}

async function sendSlackNotification(data: WaitlistSubmission) {
  const webhookUrl = process.env.SLACK_WAITLIST_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('SLACK_WAITLIST_WEBHOOK_URL not configured, skipping notification')
    return
  }

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 New Chuck Box Waitlist Signup!',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Email:*\n${data.email}`
          },
          {
            type: 'mrkdwn',
            text: `*Name:*\n${data.name || 'Not provided'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Unit Type:*\n${data.unit_type || 'Not provided'}`
          },
          {
            type: 'mrkdwn',
            text: `*Unit Size:*\n${data.unit_size || 'Not provided'}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Software:*\n${data.current_software || 'Not provided'}`
          },
          {
            type: 'mrkdwn',
            text: `*Payment Platform:*\n${data.current_payment_platform || 'Not provided'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Biggest Pain Point:*\n${data.biggest_pain_point || 'Not provided'}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Additional Info:*\n${data.additional_info || 'Not provided'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Referral: ${data.referral_source || 'Direct'}`
          }
        ]
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
    const body = await request.json() as WaitlistSubmission

    // Validate email
    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Get IP and user agent for analytics
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Insert into database
    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: body.email.toLowerCase().trim(),
        name: body.name?.trim() || null,
        unit_type: body.unit_type || null,
        unit_size: body.unit_size || null,
        current_software: body.current_software || null,
        current_payment_platform: body.current_payment_platform || null,
        biggest_pain_point: body.biggest_pain_point?.trim() || null,
        additional_info: body.additional_info?.trim() || null,
        referral_source: body.referral_source || null,
        ip_address: ip,
        user_agent: userAgent
      })

    if (error) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      )
    }

    // Send Slack notification (don't await - fire and forget)
    sendSlackNotification(body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
