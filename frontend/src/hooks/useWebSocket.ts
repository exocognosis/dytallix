import { useEffect, useRef, useState } from 'react'
import { WebSocketMessage } from '../types'
import toast from 'react-hot-toast'
import config from '../services/config'

interface WebSocketState {
  isConnected: boolean
  connectionAttempts: number
  lastConnected: Date | null
  lastError: string | null
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    connectionAttempts: 0,
    lastConnected: null,
    lastError: null,
  })

  useEffect(() => {
    function connect() {
      try {
        const wsUrl = config.websocketUrl
        config.log('info', `🔌 Attempting WebSocket connection to: ${wsUrl}`)
        
        ws.current = new WebSocket(wsUrl)

        ws.current.onopen = () => {
          config.log('info', '✅ WebSocket connected successfully')
          reconnectAttempts.current = 0
          
          setState(prev => ({
            ...prev,
            isConnected: true,
            lastConnected: new Date(),
            lastError: null,
          }))
          
          if (config.isTestnet) {
            toast.success('🚀 Connected to Dytallix Testnet')
          } else {
            toast.success('🔗 Connected to Dytallix network')
          }

          // Send initial ping to establish connection
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
              environment: config.environment,
            }))
          }
        }

        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            
            if (config.get().enableNetworkLogging) {
              config.log('debug', '📨 WebSocket message received:', message)
            }
            
            handleWebSocketMessage(message)
          } catch (error) {
            config.log('error', '❌ Failed to parse WebSocket message:', error)
            setState(prev => ({ ...prev, lastError: 'Invalid message format' }))
          }
        }

        ws.current.onclose = (event) => {
          config.log('warn', `🔌 WebSocket disconnected: ${event.code} - ${event.reason}`)
          
          setState(prev => ({
            ...prev,
            isConnected: false,
            lastError: event.reason || 'Connection closed',
          }))
          
          // Only attempt reconnection if it was an unexpected disconnection
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(3000 * Math.pow(2, reconnectAttempts.current), 30000)
            
            setTimeout(() => {
              reconnectAttempts.current++
              setState(prev => ({ ...prev, connectionAttempts: reconnectAttempts.current }))
              
              config.log('info', `🔄 WebSocket reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`)
              connect()
            }, delay)
          } else if (reconnectAttempts.current >= maxReconnectAttempts) {
            config.log('error', '❌ Max WebSocket reconnection attempts reached')
            toast.error('Unable to maintain connection to network')
          }
        }

        ws.current.onerror = (error) => {
          config.log('error', '❌ WebSocket connection error:', error)
          setState(prev => ({ ...prev, lastError: 'Connection error' }))
          
          if (config.isTestnet) {
            config.log('warn', '⚠️ Testnet WebSocket connection failed - this is expected if testnet is not running')
          }
        }

      } catch (error) {
        config.log('error', '❌ Failed to create WebSocket connection:', error)
        setState(prev => ({ ...prev, lastError: 'Failed to create connection' }))
      }
    }

    connect()

    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
      }
    }
  }, [])

  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'block':
        config.log('info', `🧱 New block mined: #${message.data.number}`)
        toast.success(`New block mined: #${message.data.number}`)
        
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('dytallix-new-block', { 
          detail: message.data 
        }))
        break
      
      case 'transaction':
        config.log('info', '💰 New transaction confirmed:', message.data.hash)
        
        // Dispatch custom event for transaction updates
        window.dispatchEvent(new CustomEvent('dytallix-transaction-update', { 
          detail: message.data 
        }))
        break
      
      case 'ai_analysis':
        config.log('info', '🤖 AI analysis completed:', message.data)
        
        // Dispatch custom event for AI analysis
        window.dispatchEvent(new CustomEvent('dytallix-ai-analysis', { 
          detail: message.data 
        }))
        break
      
      case 'system':
        config.log('info', '🔧 System message:', message.data.message)
        
        if (message.data.level === 'error') {
          toast.error(message.data.message)
        } else if (message.data.level === 'warning') {
          toast.error(message.data.message, { icon: '⚠️' })
        } else {
          toast(message.data.message, { icon: 'ℹ️' })
        }
        break
      
      default:
        config.log('debug', '❓ Unknown WebSocket message type:', message.type)
    }
  }

  const send = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageWithMetadata = {
        ...message,
        timestamp: Date.now(),
        environment: config.environment,
      }
      
      ws.current.send(JSON.stringify(messageWithMetadata))
      
      if (config.get().enableNetworkLogging) {
        config.log('debug', '📤 WebSocket message sent:', messageWithMetadata)
      }
      
      return true
    } else {
      config.log('warn', '⚠️ Cannot send WebSocket message: not connected')
      return false
    }
  }

  const ping = () => {
    return send({ type: 'ping' })
  }

  const subscribe = (channel: string) => {
    return send({ type: 'subscribe', channel })
  }

  const unsubscribe = (channel: string) => {
    return send({ type: 'unsubscribe', channel })
  }

  // Testnet-specific helper methods
  const testConnection = async (): Promise<boolean> => {
    if (!state.isConnected) {
      return false
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false)
      }, 5000)

      const handlePong = () => {
        clearTimeout(timeout)
        ws.current?.removeEventListener('message', handlePong)
        resolve(true)
      }

      ws.current?.addEventListener('message', handlePong)
      
      if (!ping()) {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  }

  return {
    // Connection state
    isConnected: state.isConnected,
    connectionAttempts: state.connectionAttempts,
    lastConnected: state.lastConnected,
    lastError: state.lastError,
    
    // Methods
    send,
    ping,
    subscribe,
    unsubscribe,
    testConnection,
    
    // Connection info
    getConnectionInfo: () => ({
      url: config.websocketUrl,
      environment: config.environment,
      readyState: ws.current?.readyState,
      ...state,
    }),
  }
}
