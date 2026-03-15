export type Category =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Income"
  | "Health"
  | "Other";

export type TransactionType = "expense" | "income";

export type PaymentMethod = "cash" | "card" | "upi" | "netbanking";

export type ExpenseStatus = "pending" | "cleared" | "flagged";

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: Category;
  type: TransactionType;
  status: ExpenseStatus;
  date: Date;
  notes?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  category: Category;
  limit: number;
  spent: number;
  month: number;
  year: number;
  userId: string;
}

export interface BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export type CreateExpenseInput = Omit<
  Expense,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
