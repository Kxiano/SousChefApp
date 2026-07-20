import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBillingFailedEmail(email: string, restaurantName: string) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') {
    console.log(`[Email Simulation] To: ${email} | Subject: Payment Failed for ${restaurantName}`)
    return
  }

  try {
    await resend.emails.send({
      from: 'Sous Chef <billing@souschef.app>',
      to: email,
      subject: `Action Required: Payment Failed for ${restaurantName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; rounded: 8px;">
          <h2 style="color: #e53e3e;">Billing Payment Failed</h2>
          <p>Hello,</p>
          <p>We were unable to process the payment for your restaurant <strong>${restaurantName}</strong>.</p>
          <p>Your account has entered a <strong>3-day grace period</strong>. To avoid losing access to your kitchen dashboard, recipes, and inventory tracking, please update your payment details immediately.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://souschef.app/dashboard" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Update Billing Details</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Sous Chef Inc. &middot; Kitchen Co-pilot SaaS</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send billing failed email:', error)
  }
}

export async function sendInviteEmail(email: string, restaurantName: string, inviteUrl: string) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') {
    console.log(`[Email Simulation] To: ${email} | Subject: Join ${restaurantName} on Sous Chef | Link: ${inviteUrl}`)
    return
  }

  try {
    await resend.emails.send({
      from: 'Sous Chef <invites@souschef.app>',
      to: email,
      subject: `Join ${restaurantName} on Sous Chef`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; rounded: 8px;">
          <h2>Kitchen Team Invitation</h2>
          <p>Hello,</p>
          <p>You have been invited to join the kitchen team at <strong>${restaurantName}</strong> on Sous Chef.</p>
          <p>Click the button below to accept the invitation and set up your account:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${inviteUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join the Kitchen</a>
          </div>
          <p style="font-size: 14px; color: #666;">This invitation link will expire soon.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Sous Chef Inc. &middot; Kitchen Co-pilot SaaS</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send invite email:', error)
  }
}
