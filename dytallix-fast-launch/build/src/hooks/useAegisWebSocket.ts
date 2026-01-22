/**
 * WebSocket Hook for Aegis Alerts
 * Manages WebSocket connection and alert handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface AegisAlert {
    type: 'high_risk' | 'critical_risk' | 'wallet_flagged' | 'pattern_detected' | 'throttle_violation' | 'review_required' | 'connected' | 'pong';
    data?: any;
    message?: string;
    timestamp: string;
}

export const useAegisWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState<AegisAlert[]>([]);
    const [latestAlert, setLatestAlert] = useState<AegisAlert | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use same host/port as the page - Nginx or server handles routing
            const wsUrl = `${protocol}//${window.location.host}/api/aegis/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Aegis WebSocket connected');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const alert: AegisAlert = JSON.parse(event.data);

                    // Ignore system messages
                    if (alert.type === 'connected' || alert.type === 'pong') {
                        return;
                    }

                    // Add to alerts list
                    setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50
                    setLatestAlert(alert);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('Aegis WebSocket disconnected');
                setIsConnected(false);

                // Attempt to reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connect();
                }, 5000);
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            setIsConnected(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
        setLatestAlert(null);
    }, []);

    const sendPing = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
    }, []);

    useEffect(() => {
        connect();

        // Ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(sendPing, 30000);

        return () => {
            clearInterval(pingInterval);
            disconnect();
        };
    }, [connect, disconnect, sendPing]);

    return {
        isConnected,
        alerts,
        latestAlert,
        clearAlerts,
        reconnect: connect
    };
};

export default useAegisWebSocket;
