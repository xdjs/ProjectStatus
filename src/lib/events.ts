// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}

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