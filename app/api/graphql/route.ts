import { ApolloServer } from "@apollo/server"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { typeDefs } from "@/lib/graphql/schema"
import { resolvers, type GraphContext } from "@/lib/graphql/resolvers"

const server = new ApolloServer<GraphContext>({ typeDefs, resolvers })
await server.start()

/** GraphQL over POST, for the signed-in user's own data only. */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.query !== "string") {
    return NextResponse.json({ error: "Send { query, variables }" }, { status: 400 })
  }

  const result = await server.executeOperation({ query: body.query, variables: body.variables }, { contextValue: { userId } })
  if (result.body.kind === "single") return NextResponse.json(result.body.singleResult)
  return NextResponse.json({ error: "Unexpected response" }, { status: 500 })
}

export async function GET() {
  return NextResponse.json({
    message: "GraphQL endpoint. Sign in, then POST { query, variables }.",
    example: { query: "{ expenses { id name amount } }" },
  })
}
