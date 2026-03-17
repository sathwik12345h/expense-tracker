import { prisma } from "@/lib/prisma"

export const resolvers = {
  Query: {
    // Get all expenses for a user
    expenses: async (_: unknown, { userId }: { userId: string }) => {
      const expenses = await prisma.expense.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      })
      return expenses.map((e) => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }))
    },

    // Get single expense
    expense: async (_: unknown, { id }: { id: string }) => {
      const expense = await prisma.expense.findUnique({ where: { id } })
      if (!expense) return null
      return {
        ...expense,
        date: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      }
    },

    // Get budgets with actual spent amounts
    budgets: async (
      _: unknown,
      { userId, month, year }: { userId: string; month: number; year: number }
    ) => {
      const budgets = await prisma.budget.findMany({
        where: { userId, month, year },
      })

      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      const expenses = await prisma.expense.findMany({
        where: {
          userId,
          type: "expense",
          date: { gte: startDate, lte: endDate },
        },
      })

      return budgets.map((budget) => {
        const spent = expenses
          .filter((e) => e.category === budget.category)
          .reduce((sum, e) => sum + e.amount, 0)
        return { ...budget, spent }
      })
    },
  },

  Mutation: {
    // Create expense
    createExpense: async (
      _: unknown,
      args: {
        userId: string
        name: string
        amount: number
        type: string
        category: string
        date: string
        note?: string
        paymentMethod?: string
      }
    ) => {
      const expense = await prisma.expense.create({
        data: {
          name: args.name,
          amount: args.amount,
          type: args.type,
          category: args.category,
          status: "cleared",
          date: new Date(args.date),
          note: args.note || null,
          paymentMethod: args.paymentMethod || null,
          userId: args.userId,
        },
      })
      return {
        ...expense,
        date: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      }
    },

    // Delete expense
    deleteExpense: async (_: unknown, { id }: { id: string }) => {
      await prisma.expense.delete({ where: { id } })
      return true
    },

    // Save budget
    saveBudget: async (
      _: unknown,
      args: {
        userId: string
        category: string
        limit: number
        month: number
        year: number
      }
    ) => {
      const id = `${args.userId}_${args.category}_${args.month}_${args.year}`
      const budget = await prisma.budget.upsert({
        where: { id },
        update: { limit: args.limit },
        create: {
          id,
          userId: args.userId,
          category: args.category,
          limit: args.limit,
          month: args.month,
          year: args.year,
          spent: 0,
        },
      })
      return { ...budget, spent: 0 }
    },
  },
}