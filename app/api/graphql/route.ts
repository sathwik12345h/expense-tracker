import { ApolloServer } from "@apollo/server"
import { NextRequest, NextResponse } from "next/server"
import { typeDefs } from "@/lib/graphql/schema"
import { resolvers } from "@/lib/graphql/resolvers"

const server = new ApolloServer({ typeDefs, resolvers })
await server.start()

export async function POST(request: NextRequest) {
  const body = await request.json()

  const result = await server.executeOperation({
    query: body.query,
    variables: body.variables,
  })

  if (result.body.kind === "single") {
    return NextResponse.json(result.body.singleResult)
  }

  return NextResponse.json({ error: "Unexpected response" }, { status: 500 })
}

export async function GET() {
  return NextResponse.json({
    message: "GraphQL endpoint ready. Send POST requests with query and variables.",
    example: {
      query: "{ expenses(userId: \"your-user-id\") { id name amount } }",
    }
  })
}