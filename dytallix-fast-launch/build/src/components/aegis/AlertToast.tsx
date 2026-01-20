/**
 * Alert Toast Component
 * Displays real-time Aegis alerts
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Bell, X, Clock } from 'lucide-react';
import type { AegisAlert } from '../../hooks/useAegisWebSocket';

interface AlertToastProps {
    alert: AegisAlert;
    onDismiss: () => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({ alert, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Slide in animation
        setTimeout(() => setIsVisible(true), 10);

        // Auto-dismiss after 10 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
        }, 10000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    const getAlertConfig = () => {
        switch (alert.type) {
            case 'critical_risk':
                return {
                    icon: AlertTriangle,
                    title: 'Critical Risk Detected',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30',
                    textColor: 'text-red-500',
                    iconBg: 'bg-red-500/20',
                    pulse: true
                };
            case 'high_risk':
                return {
                    icon: AlertTriangle,
                    title: 'High Risk Transaction',
                    bgColor: 'bg-amber-500/10',
                    borderColor: 'border-amber-500/30',
                    textColor: 'text-amber-500',
                    iconBg: 'bg-amber-500/20',
                    pulse: false
                };
            case 'wallet_flagged':
                return {
                    icon: Shield,
                    title: 'Wallet Flagged',
                    bgColor: 'bg-orange-500/10',
                    borderColor: 'border-orange-500/30',
                    textColor: 'text-orange-500',
                    iconBg: 'bg-orange-500/20',
                    pulse: false
                };
            case 'throttle_violation':
                return {
                    icon: Clock,
                    title: 'Throttle Violation',
                    bgColor: 'bg-purple-500/10',
                    borderColor: 'border-purple-500/30',
                    textColor: 'text-purple-500',
                    iconBg: 'bg-purple-500/20',
                    pulse: false
                };
            case 'review_required':
                return {
                    icon: Bell,
                    title: 'Review Required',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30',
                    textColor: 'text-blue-500',
                    iconBg: 'bg-blue-500/20',
                    pulse: false
                };
            default:
                return {
                    icon: Bell,
                    title: 'Alert',
                    bgColor: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/30',
                    textColor: 'text-gray-500',
                    iconBg: 'bg-gray-500/20',
                    pulse: false
                };
        }
    };

    const config = getAlertConfig();
    const Icon = config.icon;

    const getMessage = () => {
        if (alert.message) return alert.message;

        if (alert.data) {
            if (alert.data.tx_hash) {
                return `Transaction ${alert.data.tx_hash.slice(0, 16)}... - Risk: ${alert.data.risk_score}`;
            }
            if (alert.data.address) {
                return `Wallet ${alert.data.address.slice(0, 16)}...`;
            }
        }

        return 'New alert received';
    };

    return (
        <div
            className={`fixed top-24 right-6 z-50 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div
                className={`${config.bgColor} ${config.borderColor} border backdrop-blur-md rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]`}
            >
                <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}>
                        <Icon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-semibold ${config.textColor}`}>
                                {config.title}
                            </h4>
                            <button
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(onDismiss, 300);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground break-words">
                            {getMessage()}
                        </p>
                        {alert.data?.risk_score && (
                            <div className="mt-2 flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Risk Score:</span>
                                <span className={`font-semibold ${config.textColor}`}>
                                    {alert.data.risk_score}
                                </span>
                                {alert.data.priority && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className={`font-semibold ${config.textColor}`}>
                                            {alert.data.priority}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AlertContainerProps {
    alerts: AegisAlert[];
    onDismiss: (index: number) => void;
}

export const AlertContainer: React.FC<AlertContainerProps> = ({ alerts, onDismiss }) => {
    return (
        <>
            {alerts.slice(0, 3).map((alert, index) => (
                <div key={`${alert.timestamp}-${index}`} style={{ top: `${6 + index * 7}rem` }}>
                    <AlertToast alert={alert} onDismiss={() => onDismiss(index)} />
                </div>
            ))}
        </>
    );
};

export default AlertToast;
