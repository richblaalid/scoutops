import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = getResendClient()

  const fromEmail = process.env.EMAIL_FROM || 'ChuckBox <noreply@chuckbox.app>'

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  })

  if (error) {
    console.error('Failed to send email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data
}
