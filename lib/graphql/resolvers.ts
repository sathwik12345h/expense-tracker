import { GraphQLError } from "graphql"
import { prisma } from "@/lib/prisma"
import { parseBudget, parseExpense } from "@/lib/validate"

/** Set by the route from the session. Every resolver works on this user's data only. */
export interface GraphContext {
  userId: string
}

// The schema still accepts `userId` arguments so old queries keep parsing, but
// they are ignored: who you are comes from your session, never from the query.

type Dated = { date: Date; createdAt: Date; updatedAt: Date }
const iso = <T extends Dated>(row: T) => ({
  ...row,
  date: row.date.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const invalid = (message: string) => new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } })

export const resolvers = {
  Query: {
    expenses: async (_: unknown, __: unknown, { userId }: GraphContext) => {
      const rows = await prisma.expense.findMany({ where: { userId }, orderBy: { date: "desc" } })
      return rows.map(iso)
    },

    expense: async (_: unknown, { id }: { id: string }, { userId }: GraphContext) => {
      const row = await prisma.expense.findFirst({ where: { id, userId } })
      return row ? iso(row) : null
    },

    /** Budgets for a month, each with what has been spent against it. */
    budgets: async (_: unknown, { month, year }: { month: number; year: number }, { userId }: GraphContext) => {
      const [budgets, spent] = await Promise.all([
        prisma.budget.findMany({ where: { userId, month, year } }),
        prisma.expense.groupBy({
          by: ["category"],
          where: { userId, type: "expense", date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
          _sum: { amount: true },
        }),
      ])
      const byCategory = new Map(spent.map((s) => [s.category, s._sum.amount ?? 0]))
      return budgets.map((b) => ({ ...b, spent: byCategory.get(b.category) ?? 0 }))
    },
  },

  Mutation: {
    createExpense: async (_: unknown, args: Record<string, unknown>, { userId }: GraphContext) => {
      const parsed = parseExpense(args)
      if (!parsed.ok) throw invalid(parsed.error)
      return iso(await prisma.expense.create({ data: { ...parsed.data, userId } }))
    },

    deleteExpense: async (_: unknown, { id }: { id: string }, { userId }: GraphContext) => {
      const result = await prisma.expense.deleteMany({ where: { id, userId } })
      return result.count > 0
    },

    saveBudget: async (_: unknown, args: Record<string, unknown>, { userId }: GraphContext) => {
      const parsed = parseBudget(args)
      if (!parsed.ok) throw invalid(parsed.error)
      const { category, limit, month, year } = parsed.data
      const id = `${userId}_${category}_${month}_${year}`
      const budget = await prisma.budget.upsert({
        where: { id },
        update: { limit },
        create: { id, userId, category, limit, month, year, spent: 0 },
      })
      return { ...budget, spent: 0 }
    },
  },
}
