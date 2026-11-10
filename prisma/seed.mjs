// Demo data for local development: `npm run db:seed`.
// Creates (or refreshes) the demo account the sign-in page mentions and fills
// it with six months of believable entries plus this month's budgets.
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const DEMO = { name: "Alex Morgan", email: "test@spendwise.com", password: "password123" }

// small deterministic PRNG so every seed produces the same ledger
let seed = 20261109
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (list) => list[Math.floor(rand() * list.length)]
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100

const MERCHANTS = {
  Food: [
    ["Blue Bottle Coffee", 4, 9], ["Whole Foods", 38, 140], ["DoorDash", 18, 46], ["Chipotle", 11, 19],
    ["Trader Joe's", 24, 88], ["Sweetgreen", 13, 21], ["Joe's Pizza", 6, 24], ["Starbucks", 4, 8],
  ],
  Travel: [["Uber", 9, 34], ["MTA subway", 2.9, 2.9], ["Lyft", 8, 28], ["Shell", 32, 58], ["Amtrak", 48, 120]],
  Shopping: [["Amazon", 12, 160], ["Target", 18, 95], ["Uniqlo", 25, 110], ["Apple Store", 29, 199], ["IKEA", 22, 140]],
  Entertainment: [["AMC Theatres", 14, 34], ["Steam", 10, 60], ["Bowery Ballroom", 35, 80], ["Barnes & Noble", 12, 42]],
  Health: [["CVS Pharmacy", 8, 46], ["One Medical", 25, 60], ["Yoga class", 18, 28]],
  Other: [["Haircut", 28, 55], ["Gift for Sam", 20, 90], ["Dry cleaning", 14, 32], ["Post office", 5, 22]],
}

// same name every month, so they read as subscriptions
const RECURRING = [
  { name: "Rent", category: "Bills", amount: 1650, day: 1, method: "netbanking" },
  { name: "Con Edison", category: "Bills", amount: 96, day: 6, wobble: 22, method: "netbanking" },
  { name: "Verizon Fios", category: "Bills", amount: 79.99, day: 9, method: "card" },
  { name: "T-Mobile", category: "Bills", amount: 65, day: 14, method: "card" },
  { name: "Netflix", category: "Entertainment", amount: 15.49, day: 3, method: "card" },
  { name: "Spotify", category: "Entertainment", amount: 11.99, day: 12, method: "card" },
  { name: "Equinox", category: "Health", amount: 185, day: 5, method: "card" },
  { name: "iCloud+", category: "Other", amount: 2.99, day: 18, method: "card" },
]

const WEIGHTS = [
  ["Food", 0.46], ["Travel", 0.2], ["Shopping", 0.14], ["Entertainment", 0.08], ["Health", 0.06], ["Other", 0.06],
]
function weightedCategory() {
  let r = rand()
  for (const [c, w] of WEIGHTS) {
    if ((r -= w) <= 0) return c
  }
  return "Food"
}

function at(year, month, day, hour = 12) {
  return new Date(year, month, day, hour, Math.floor(rand() * 60))
}

async function main() {
  const password = await bcrypt.hash(DEMO.password, 10)
  const user = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: { name: DEMO.name, password },
    create: { name: DEMO.name, email: DEMO.email, password },
  })

  await prisma.expense.deleteMany({ where: { userId: user.id } })
  await prisma.budget.deleteMany({ where: { userId: user.id } })

  const now = new Date()
  const rows = []

  for (let back = 5; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const y = first.getFullYear()
    const m = first.getMonth()
    const lastDay = back === 0 ? now.getDate() : new Date(y, m + 1, 0).getDate()

    // income
    rows.push({ name: "Payroll — Acme Corp", amount: 4850, type: "income", category: "Income", date: at(y, m, 1, 9), paymentMethod: "netbanking" })
    if (lastDay >= 15) {
      rows.push({ name: "Payroll — Acme Corp", amount: 4850, type: "income", category: "Income", date: at(y, m, 15, 9), paymentMethod: "netbanking" })
    }
    if (rand() > 0.45 && lastDay >= 20) {
      rows.push({ name: "Freelance invoice", amount: between(400, 1400), type: "income", category: "Income", date: at(y, m, 20, 16), paymentMethod: "netbanking" })
    }

    // fixed bills and subscriptions
    for (const r of RECURRING) {
      if (r.day > lastDay) continue
      const amount = r.wobble ? Math.round((r.amount + (rand() - 0.5) * r.wobble) * 100) / 100 : r.amount
      rows.push({ name: r.name, amount, type: "expense", category: r.category, date: at(y, m, r.day, 8), paymentMethod: r.method })
    }

    // day-to-day spending, a little heavier at weekends
    for (let day = 1; day <= lastDay; day++) {
      const dow = new Date(y, m, day).getDay()
      const weekend = dow === 0 || dow === 6
      const count = Math.floor(rand() * (weekend ? 4 : 3)) + (weekend ? 1 : 0)
      for (let i = 0; i < count; i++) {
        const category = weightedCategory()
        const [name, lo, hi] = pick(MERCHANTS[category])
        rows.push({
          name,
          amount: between(lo, hi),
          type: "expense",
          category,
          date: at(y, m, day, 8 + Math.floor(rand() * 13)),
          paymentMethod: pick(["card", "card", "card", "cash", "upi"]),
          status: back === 0 && day >= lastDay - 1 && rand() > 0.6 ? "pending" : "cleared",
        })
      }
    }
  }

  await prisma.expense.createMany({
    data: rows.map((r) => ({ status: "cleared", note: null, ...r, userId: user.id })),
  })

  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const limits = { Food: 900, Travel: 320, Shopping: 300, Bills: 2000, Entertainment: 140, Health: 260, Other: 150 }
  for (const [category, limit] of Object.entries(limits)) {
    const id = `${user.id}_${category}_${month}_${year}`
    await prisma.budget.upsert({
      where: { id },
      update: { limit },
      create: { id, userId: user.id, category, limit, month, year, spent: 0 },
    })
  }

  console.log(`Seeded ${rows.length} entries and ${Object.keys(limits).length} budgets for ${DEMO.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
