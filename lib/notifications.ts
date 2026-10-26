import { Resend } from "resend"

interface BudgetAlertProps {
  userName: string
  userEmail: string
  category: string
  spent: number
  limit: number
  percentage: number
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export async function sendBudgetAlert({
  userName,
  userEmail,
  category,
  spent,
  limit,
  percentage,
}: BudgetAlertProps) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const isOver = spent > limit
  const subject = isOver
    ? `You've gone over your ${category} budget`
    : `You've used ${Math.round(percentage)}% of your ${category} budget`

  const pct = Math.min(percentage, 100)
  const barColor = isOver ? "#c4352a" : percentage > 90 ? "#f0b429" : "#16150f"
  const remaining = isOver ? `${usd(spent - limit)} over` : `${usd(limit - spent)} left`

  const { error } = await resend.emails.send({
    from: "Spendwise <onboarding@resend.dev>",
    to: userEmail,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px 12px;background:#f3f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16150f;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
            <tr>
              <td style="padding:0 4px 18px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:-0.3px;">Spendwise</span>
                <span style="float:right;font-family:'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:2px;color:#6b675d;line-height:30px;">BUDGET NOTE</span>
              </td>
            </tr>
            <tr>
              <td style="background:#fbfaf6;border:1px solid #ddd6c7;border-radius:20px;padding:32px;">
                <p style="margin:0 0 6px;font-family:'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:2px;color:#6b675d;text-transform:uppercase;">${category}</p>
                <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.1;">
                  ${isOver ? "You&rsquo;ve gone over budget." : `${Math.round(percentage)}% of the way there.`}
                </h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3b3a33;">
                  Hi ${userName}, ${isOver
                    ? `your <b>${category}</b> spending has passed the limit you set for this month.`
                    : `you&rsquo;ve used <b>${Math.round(percentage)}%</b> of your <b>${category}</b> budget for this month.`}
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1.5px dashed #cfc7b5;border-bottom:1.5px dashed #cfc7b5;">
                  <tr>
                    <td style="padding:14px 0 6px;color:#6b675d;">Spent</td>
                    <td style="padding:14px 0 6px;text-align:right;font-weight:600;">${usd(spent)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 14px;color:#6b675d;">Limit</td>
                    <td style="padding:0 0 14px;text-align:right;font-weight:600;">${usd(limit)}</td>
                  </tr>
                </table>

                <div style="margin:20px 0 6px;background:#eae5d9;border-radius:999px;height:8px;overflow:hidden;">
                  <div style="background:${barColor};width:${pct}%;height:8px;border-radius:999px;"></div>
                </div>
                <p style="margin:0 0 28px;font-size:12px;color:${isOver ? "#c4352a" : "#6b675d"};text-align:right;">${remaining}</p>

                <a href="${process.env.NEXTAUTH_URL}/dashboard"
                  style="display:inline-block;background:#16150f;color:#f3f0e8;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:600;font-size:14px;">
                  Open your ledger &rarr;
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;font-size:11.5px;color:#6b675d;line-height:1.6;">
                You&rsquo;re getting this because you set a ${category} budget in Spendwise.
              </td>
            </tr>
          </table>
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
