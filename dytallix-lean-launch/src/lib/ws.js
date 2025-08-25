// WebSocket utilities
export class WSClient {
  constructor(url) {
    this.url = url
    this.ws = null
    this.callbacks = new Map()
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        this.ws.onopen = () => resolve(this)
        this.ws.onerror = reject
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.callbacks.forEach(callback => callback(data))
          } catch (e) {
            console.error('WebSocket message parse error:', e)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  onMessage(callback) {
    const id = Date.now() + Math.random()
    this.callbacks.set(id, callback)
    return () => this.callbacks.delete(id)
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.callbacks.clear()
  }
}

// Helper function to connect WebSocket
export function connectWS(url) {
  const client = new WSClient(url)
  return client.connect()
}

export default WSClient