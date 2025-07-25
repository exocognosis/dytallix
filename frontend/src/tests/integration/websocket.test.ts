import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../../hooks/useWebSocket'

describe('WebSocket Hook - Testnet Integration', () => {
  let mockWebSocket: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a mock WebSocket
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
      readyState: 1, // OPEN
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
    }

    // Mock WebSocket constructor
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)
  })

  it('should connect to testnet WebSocket URL', () => {
    renderHook(() => useWebSocket())
    
    expect(WebSocket).toHaveBeenCalledWith('wss://testnet-api.dytallix.io/ws')
  })

  it('should handle connection state correctly', () => {
    const { result } = renderHook(() => useWebSocket())
    
    // Simulate connection open
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('should send ping with environment metadata', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      result.current.ping()
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"environment":"testnet"')
    )
  })

  it('should handle testnet-specific messages', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const testMessage = {
      type: 'block',
      data: { number: 12345 },
      timestamp: Date.now(),
    }

    // Mock window.dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(testMessage),
        })
      }
    })

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dytallix-new-block',
        detail: testMessage.data,
      })
    )
  })

  it('should provide connection info for monitoring', () => {
    const { result } = renderHook(() => useWebSocket())
    
    const connectionInfo = result.current.getConnectionInfo()
    
    expect(connectionInfo).toEqual(
      expect.objectContaining({
        url: 'wss://testnet-api.dytallix.io/ws',
        environment: 'testnet',
        readyState: 1,
      })
    )
  })

  it('should test connection with ping/pong', async () => {
    const { result } = renderHook(() => useWebSocket())
    
    // Mock successful ping
    mockWebSocket.send.mockReturnValue(true)
    
    // Test connection (this would normally wait for pong, but we'll mock it)
    const connectionTest = result.current.testConnection()
    
    // Simulate pong response
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ type: 'pong' }),
        })
      }
    })

    expect(mockWebSocket.send).toHaveBeenCalled()
  })

  it('should handle connection errors gracefully', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('Connection failed'))
      }
    })

    expect(result.current.lastError).toBe('Connection error')
  })

  it('should attempt reconnection on unexpected disconnect', () => {
    renderHook(() => useWebSocket())
    
    // Mock setTimeout
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1006, reason: 'Connection lost' }) // Abnormal close
      }
    })

    expect(setTimeoutSpy).toHaveBeenCalled()
  })

  it('should subscribe and unsubscribe to channels', () => {
    const { result } = renderHook(() => useWebSocket())
    
    act(() => {
      result.current.subscribe('transactions')
      result.current.unsubscribe('transactions')
    })

    expect(mockWebSocket.send).toHaveBeenCalledTimes(2)
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"subscribe"')
    )
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"unsubscribe"')
    )
  })
})