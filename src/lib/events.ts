// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}

export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  const encoder = new TextEncoder()
  const encodedMessage = encoder.encode(message)
  
  console.log(`Broadcasting to ${connections.size} connections:`, data)
  
  connections.forEach(controller => {
    try {
      controller.enqueue(encodedMessage)
    } catch (error) {
      console.log('Removing dead connection:', error)
      // Remove dead connections
      connections.delete(controller)
    }
  })
} 