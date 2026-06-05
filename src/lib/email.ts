import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const { error } = await resend.emails.send({
    from: 'BeforeTouch <notifications@beforetouch.com>',
    to,
    subject,
    html,
  })

  if (error) {
    throw error
  }
}
