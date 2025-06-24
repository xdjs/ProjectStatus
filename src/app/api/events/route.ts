import { NextRequest } from 'next/server'

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      connections.add(controller)
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\\n\\n`)
      
      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\\n\\n`)
        } catch (error) {
          clearInterval(heartbeat)
          connections.delete(controller)
        }
      }, 30000) // 30 second heartbeat
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        connections.delete(controller)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Function to broadcast updates to all connected clients
export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\\n\\n`
  
  connections.forEach(controller => {
    try {
      controller.enqueue(message)
    } catch (error) {
      // Remove dead connections
      connections.delete(controller)
    }
  })
} 