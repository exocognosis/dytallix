/**
 * Aegis WebSocket Server
 * Real-time alert broadcasting for high-risk transactions
 */

import { WebSocketServer } from 'ws';
import { logInfo, logError, logWarn } from '../../logger.js';

class AegisWebSocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Set();
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server) {
        this.wss = new WebSocketServer({
            server,
            path: '/api/aegis/ws'
        });

        this.wss.on('connection', (ws, req) => {
            const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

            logInfo('Aegis WebSocket client connected', { clientId });
            this.clients.add(ws);

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to Aegis Alert System',
                timestamp: new Date().toISOString()
            }));

            // Handle client messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(ws, data);
                } catch (error) {
                    logError('Invalid WebSocket message', { error: error.message });
                }
            });

            // Handle disconnection
            ws.on('close', () => {
                logInfo('Aegis WebSocket client disconnected', { clientId });
                this.clients.delete(ws);
            });

            // Handle errors
            ws.on('error', (error) => {
                logError('WebSocket error', { clientId, error: error.message });
                this.clients.delete(ws);
            });
        });

        logInfo('Aegis WebSocket server initialized', { path: '/api/aegis/ws' });
    }

    /**
     * Handle messages from clients
     */
    handleClientMessage(ws, data) {
        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
            case 'subscribe':
                // Future: Handle subscription to specific alert types
                ws.send(JSON.stringify({ type: 'subscribed', timestamp: new Date().toISOString() }));
                break;
            default:
                logWarn('Unknown WebSocket message type', { type: data.type });
        }
    }

    /**
     * Broadcast alert to all connected clients
     */
    broadcast(alertType, data) {
        if (!this.wss || this.clients.size === 0) {
            return;
        }

        const alert = {
            type: alertType,
            data,
            timestamp: new Date().toISOString()
        };

        const message = JSON.stringify(alert);
        let successCount = 0;
        let failCount = 0;

        this.clients.forEach((client) => {
            if (client.readyState === 1) { // WebSocket.OPEN
                try {
                    client.send(message);
                    successCount++;
                } catch (error) {
                    logError('Failed to send WebSocket message', { error: error.message });
                    failCount++;
                }
            }
        });

        logInfo('Aegis alert broadcasted', {
            alertType,
            clients: this.clients.size,
            success: successCount,
            failed: failCount
        });
    }

    /**
     * Send high-risk alert
     */
    alertHighRisk(txData) {
        this.broadcast('high_risk', {
            tx_hash: txData.tx_hash,
            from: txData.from,
            to: txData.to,
            amount: txData.amount,
            risk_score: txData.risk_score,
            risk_level: txData.risk_level,
            confidence: txData.confidence,
            breakdown: txData.breakdown
        });
    }

    /**
     * Send critical-risk alert
     */
    alertCriticalRisk(txData) {
        this.broadcast('critical_risk', {
            tx_hash: txData.tx_hash,
            from: txData.from,
            to: txData.to,
            amount: txData.amount,
            risk_score: txData.risk_score,
            risk_level: txData.risk_level,
            confidence: txData.confidence,
            breakdown: txData.breakdown,
            priority: 'CRITICAL'
        });
    }

    /**
     * Send wallet flagged alert
     */
    alertWalletFlagged(address, flagCount, riskScore) {
        this.broadcast('wallet_flagged', {
            address,
            flag_count: flagCount,
            risk_score: riskScore,
            message: `Wallet ${address} has been flagged ${flagCount} times`
        });
    }

    /**
     * Send pattern detected alert
     */
    alertPatternDetected(pattern, addresses, description) {
        this.broadcast('pattern_detected', {
            pattern,
            addresses,
            description,
            severity: 'HIGH'
        });
    }

    /**
     * Send throttle violation alert
     */
    alertThrottleViolation(address, riskScore, throttleLevel) {
        this.broadcast('throttle_violation', {
            address,
            risk_score: riskScore,
            throttle_level: throttleLevel,
            message: `Wallet ${address} violated throttle limits`
        });
    }

    /**
     * Send review required alert
     */
    alertReviewRequired(txData, priority) {
        this.broadcast('review_required', {
            tx_hash: txData.tx_hash,
            from: txData.from,
            to: txData.to,
            amount: txData.amount,
            risk_score: txData.risk_score,
            priority: priority === 2 ? 'CRITICAL' : priority === 1 ? 'HIGH' : 'NORMAL',
            message: 'Transaction requires manual review'
        });
    }

    /**
     * Get connection stats
     */
    getStats() {
        return {
            connected_clients: this.clients.size,
            server_running: this.wss !== null
        };
    }
}

// Export singleton instance
export const aegisWebSocket = new AegisWebSocketServer();

export default aegisWebSocket;
