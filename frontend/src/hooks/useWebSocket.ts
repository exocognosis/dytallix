import { useEffect, useRef } from 'react'
import { WebSocketMessage } from '../types'
import toast from 'react-hot-toast'

const WS_URL = 'ws://localhost:3030/ws'

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    function connect() {
      try {
        ws.current = new WebSocket(WS_URL)

        ws.current.onopen = () => {
          console.log('WebSocket connected')
          reconnectAttempts.current = 0
          toast.success('Connected to Dytallix network')
        }

        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            handleWebSocketMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        ws.current.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          
          // Only attempt reconnection if it was an unexpected disconnection
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            setTimeout(() => {
              reconnectAttempts.current++
              console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
              connect()
            }, 3000 * reconnectAttempts.current) // Exponential backoff
          }
        }

        ws.current.onerror = () => {
          console.warn('WebSocket connection failed - real-time updates disabled')
          // Don't spam error logs for expected failures
        }

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
      }
    }

    connect()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [])

  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'block':
        toast.success(`New block mined: #${message.data.number}`)
        // Dispatch to global state or trigger refetch
        break
      
      case 'transaction':
        console.log('New transaction:', message.data)
        // Update transaction state
        break
      
      case 'ai_analysis':
        console.log('AI analysis update:', message.data)
        // Update AI analysis state
        break
      
      case 'system':
        console.log('System message:', message.data)
        break
      
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    send: (message: any) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message))
      }
    }
  }
}
