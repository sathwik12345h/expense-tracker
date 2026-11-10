import { Resend } from "resend"
import { logger } from "@/lib/logger"

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

/** Names and categories come from people: never let them carry markup into the email. */
const esc = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch)

// The email wears the app's daytime colours (email clients can't flip a coin).
const INK = "#0b2b22"
const SOFT = "#53685e"
const CANVAS = "#eef4e9"
const SURFACE = "#fbfdf6"
const LINE = "#d2ddca"
const CORAL = "#ff5a36"
const GREEN = "#0f6b52"
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

/** The "you're close to (or past) a cap" email. Returns false if it couldn't be sent. */
export async function sendBudgetAlert({ userName, userEmail, category, spent, limit, percentage }: BudgetAlertProps) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const over = spent > limit
  const pct = Math.round(percentage)
  const name = esc(userName)
  const cat = esc(category)

  const subject = over ? `${category} has gone past its cap` : `${category} is at ${pct}% of its cap`
  const bar = over ? CORAL : percentage > 90 ? "#f0b429" : GREEN
  const remaining = over ? `${usd(spent - limit)} over` : `${usd(limit - spent)} left`
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")

  const { error } = await resend.emails.send({
    from: "Spendwise <onboarding@resend.dev>",
    to: userEmail,
    subject,
    html: `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:28px 12px;background:${CANVAS};font-family:${FONT};color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr>
        <td style="padding:0 6px 16px;font-size:20px;font-weight:700;letter-spacing:-0.6px;">Spendwise</td>
      </tr>
      <tr>
        <td style="background:${SURFACE};border:1px solid ${LINE};border-radius:24px;padding:32px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${over ? CORAL : SOFT};">
            ${over ? "Past the cap" : "Heads up"} &middot; ${cat}
          </p>
          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.12;font-weight:700;letter-spacing:-0.9px;">
            ${over ? `${cat} is ${usd(spent - limit)} over.` : `${cat} is ${pct}% used.`}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${SOFT};">
            Hi ${name}, ${
              over
                ? `this month's ${cat} spending has passed the cap you set. Nothing breaks; it's just good to know.`
                : `you've used ${pct}% of this month's ${cat} cap, so there's still room to slow down.`
            }
          </p>

          <div style="background:#e3ecdc;border-radius:999px;height:10px;overflow:hidden;">
            <div style="background:${bar};width:${Math.min(100, Math.max(0, percentage))}%;height:10px;border-radius:999px;"></div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 28px;font-size:14px;">
            <tr>
              <td style="color:${SOFT};">${usd(spent)} of ${usd(limit)}</td>
              <td style="text-align:right;font-weight:700;color:${over ? CORAL : INK};">${remaining}</td>
            </tr>
          </table>

          <a href="${base}/dashboard/budget"
            style="display:inline-block;background:${CORAL};color:#2a0c03;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;">
            See your budgets &rarr;
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 6px 0;font-size:12px;color:${SOFT};line-height:1.6;">
          You're getting this because you set a ${cat} cap in Spendwise. Remove the cap and these stop.
        </td>
      </tr>
    </table>
  </body>
</html>`,
  })

  if (error) {
    logger.error("Failed to send budget alert email", { error: String(error.message ?? error) })
    return false
  }
  return true
}
