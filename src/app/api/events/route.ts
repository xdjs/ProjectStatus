import { NextRequest } from 'next/server'
import { addConnection, removeConnection } from '@/lib/events'

// Prevent static generation for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      addConnection(controller)
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\\n\\n`)
      
      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\\n\\n`)
        } catch (error) {
          clearInterval(heartbeat)
          removeConnection(controller)
        }
      }, 30000) // 30 second heartbeat
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        removeConnection(controller)
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