import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { command } = body

    // In production, forward to MCP server
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002'
    
    // Simulate MCP response
    let output = ''
    let success = true

    switch (command) {
      case 'get fixtures':
        output = 'Retrieved 4 upcoming fixtures: Brazil vs Argentina, France vs Germany...'
        break
      case 'analyze match':
        output = 'Match analysis complete. Home team win probability: 0.72, Away team win probability: 0.28'
        break
      case 'get predictions':
        output = 'Current market: Home 0.55, Draw 0.25, Away 0.20. Total volume: 1250 USDC'
        break
      default:
        output = `Unknown command: ${command}. Available commands: get fixtures, analyze match, get predictions`
        success = false
    }

    return NextResponse.json({ output, success })
  } catch (error) {
    return NextResponse.json(
      { output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, success: false },
      { status: 500 }
    )
  }
}