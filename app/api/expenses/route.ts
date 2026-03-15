import { NextResponse } from "next/server"
import type { Expense } from "@/types"


const mockExpenses: Expense[] = [
  {
    id: "exp_1",
    name: "Grocery Store",
    amount: 1240,
    type: "expense",
    category: "Food",
    userId: "user_1",
    date: new Date("2024-03-10"),
    status: "cleared",
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "exp_2",
    name: "Netflix",
    amount: 649,
    type: "expense",
    category: "Entertainment",
    userId: "user_1",
    date: new Date("2024-03-09"),
    status: "cleared",
    createdAt: new Date("2024-03-09"),
    updatedAt: new Date("2024-03-09"),
  },
  {
    id: "exp_3",
    name: "March Salary",
    amount: 85000,
    type: "income",
    category: "Income",
    userId: "user_1",
    date: new Date("2024-03-01"),
    status: "cleared",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "exp_4",
    name: "Electricity Bill",
    amount: 2100,
    type: "expense",
    category: "Bills",
    userId: "user_1",
    date: new Date("2024-03-03"),
    status: "cleared",
    createdAt: new Date("2024-03-03"),
    updatedAt: new Date("2024-03-03"),
  },
  {
    id: "exp_5",
    name: "Uber Eats",
    amount: 480,
    type: "expense",
    category: "Food",
    userId: "user_1",
    date: new Date("2024-03-05"),
    status: "cleared",
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05"),
  },
]

// GET /api/expenses
export async function GET() {
  return NextResponse.json({
    data: mockExpenses,
    error: null,
    success: true,
  })
}

// POST /api/expenses
export async function POST(request: Request) {
  const body = await request.json()

  // Week 2: this will save to real database
  const newExpense: Expense = {
    id: `exp_${Date.now()}`,
    ...body,
    userId: "user_1",
    status: "cleared",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return NextResponse.json({
    data: newExpense,
    error: null,
    success: true,
  }, { status: 201 })
}