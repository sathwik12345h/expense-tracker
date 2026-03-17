export const typeDefs = `#graphql
  type Expense {
    id: String!
    name: String!
    amount: Float!
    type: String!
    category: String!
    status: String!
    date: String!
    note: String
    paymentMethod: String
    userId: String!
    createdAt: String!
    updatedAt: String!
  }

  type Budget {
    id: String!
    category: String!
    limit: Float!
    spent: Float!
    month: Int!
    year: Int!
    userId: String!
  }

  type User {
    id: String!
    name: String!
    email: String!
  }

  type Query {
    expenses(userId: String!): [Expense!]!
    expense(id: String!): Expense
    budgets(userId: String!, month: Int!, year: Int!): [Budget!]!
  }

  type Mutation {
    createExpense(
      userId: String!
      name: String!
      amount: Float!
      type: String!
      category: String!
      date: String!
      note: String
      paymentMethod: String
    ): Expense!

    deleteExpense(id: String!): Boolean!

    saveBudget(
      userId: String!
      category: String!
      limit: Float!
      month: Int!
      year: Int!
    ): Budget!
  }
`