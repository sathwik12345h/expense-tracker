import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface BudgetAlertProps {
  userName: string
  userEmail: string
  category: string
  spent: number
  limit: number
  percentage: number
}

export async function sendBudgetAlert({
  userName,
  userEmail,
  category,
  spent,
  limit,
  percentage,
}: BudgetAlertProps) {
  const isOver = spent > limit
  const subject = isOver
    ? `⚠️ You exceeded your ${category} budget`
    : `🔔 You've used ${Math.round(percentage)}% of your ${category} budget`

  const { data, error } = await resend.emails.send({
    from: "Spendwise <onboarding@resend.dev>",
    to: userEmail,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: 'DM Sans', Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0a0a0f, #0f0f1a); padding: 32px; text-align: center;">
              <div style="display: inline-block; background: linear-gradient(135deg, #d97706, #fbbf24); width: 44px; height: 44px; border-radius: 12px; line-height: 44px; font-size: 20px; font-weight: bold; color: #000; margin-bottom: 12px;">₹</div>
              <h1 style="color: #fbbf24; font-size: 22px; margin: 0; font-weight: 600;">Spendwise</h1>
              <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0;">Budget Alert</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <p style="color: #1a1a2e; font-size: 16px; margin: 0 0 20px;">Hi <b>${userName}</b>,</p>
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                ${isOver
                  ? `You have <b style="color: #dc2626;">exceeded</b> your <b>${category}</b> budget for this month.`
                  : `You have used <b style="color: #d97706;">${Math.round(percentage)}%</b> of your <b>${category}</b> budget.`
                }
              </p>

              <!-- Stats -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: #64748b; font-size: 13px;">Budget limit</span>
                  <span style="color: #1a1a2e; font-weight: 600; font-size: 13px;">₹${limit.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                  <span style="color: #64748b; font-size: 13px;">Amount spent</span>
                  <span style="color: ${isOver ? '#dc2626' : '#d97706'}; font-weight: 600; font-size: 13px;">₹${spent.toLocaleString()}</span>
                </div>
                <!-- Progress bar -->
                <div style="background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden;">
                  <div style="background: ${isOver ? '#dc2626' : percentage > 75 ? '#d97706' : '#10b981'}; width: ${Math.min(percentage, 100)}%; height: 100%; border-radius: 999px;"></div>
                </div>
                <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0; text-align: right;">${Math.round(percentage)}% used</p>
              </div>

              <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                style="display: block; background: linear-gradient(135deg, #d97706, #fbbf24); color: #000; text-decoration: none; text-align: center; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                View Dashboard →
              </a>
            </div>

            <!-- Footer -->
            <div style="padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">You're receiving this because you set a budget in Spendwise.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })

  if (error) {
    console.error("Failed to send budget alert email:", error)
    return false
  }

  return true
}