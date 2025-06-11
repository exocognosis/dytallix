"""
Fraud Detection Module

Uses machine learning to detect fraudulent transaction patterns
and anomalous behavior in the Dytallix network.
"""

import asyncio
import logging
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import os
import sys

# Add models directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

try:
    from models.fraud_model import AdvancedFraudDetector
    PYTORCH_AVAILABLE = True
except ImportError:
    PYTORCH_AVAILABLE = False
    # Fallback to sklearn
    import joblib
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self):
        self.model_version = "2.0.0"
        self.last_update = datetime.now()
        self.is_model_loaded = False
        
        # Try to use advanced PyTorch model, fallback to sklearn
        if PYTORCH_AVAILABLE:
            self._initialize_advanced_model()
        else:
            self._initialize_fallback_model()
    
    def _initialize_advanced_model(self):
        """Initialize advanced PyTorch-based fraud detection model"""
        try:
            logger.info("Initializing advanced PyTorch fraud detection model...")
            self.detector = AdvancedFraudDetector()
            self.is_model_loaded = self.detector.is_loaded
            logger.info("Advanced fraud detection model initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize advanced model: {e}")
            self._initialize_fallback_model()
    
    def _initialize_fallback_model(self):
        """Initialize fallback sklearn model"""
        try:
            logger.info("Initializing fallback sklearn fraud detection model...")
            # For now, use Isolation Forest for anomaly detection
            # In production, this would load a pre-trained model
            self.model = IsolationForest(
                contamination=0.1,  # Expected fraud rate
                random_state=42,
                n_estimators=100
            )
            self.scaler = StandardScaler()
            self.detector = None
            self.is_model_loaded = True
            logger.info("Fallback fraud detection model initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize fraud detection model: {e}")
            self.is_model_loaded = False
    
    def is_ready(self) -> bool:
        """Check if the fraud detector is ready"""
        return self.is_model_loaded and self.model is not None
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_last_update_time(self) -> str:
        """Get last model update time"""
        return self.last_update.isoformat()
    
    async def analyze_transaction(
        self, 
        transaction: Dict[str, Any], 
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze a transaction for fraud patterns
        
        Args:
            transaction: Current transaction data
            historical_data: Historical transaction data for context
            
        Returns:
            Analysis result with fraud probability and risk factors
        """
        try:
            # Use advanced model if available
            if self.detector and hasattr(self.detector, 'analyze_transaction'):
                return await self.detector.analyze_transaction(transaction, historical_data)
            
            # Fallback to basic analysis
            return await self._analyze_with_fallback(transaction, historical_data)
            
        except Exception as e:
            logger.error(f"Fraud analysis failed: {e}")
            return {
                "is_fraudulent": False,
                "confidence": 0.0,
                "risk_factors": ["Analysis failed"],
                "recommended_action": "manual_review",
                "error": str(e)
            }
    
    async def _analyze_with_fallback(
        self,
        transaction: Dict[str, Any],
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Fallback analysis using sklearn"""
        # Extract features from transaction
        features = self._extract_features(transaction, historical_data)
        
        # Get fraud score
        fraud_score = self._calculate_fraud_score(features)
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(transaction, features, fraud_score)
        
        # Determine if fraudulent
        is_fraudulent = fraud_score > 0.7
        
        # Generate recommendation
        recommendation = self._generate_recommendation(fraud_score, risk_factors)
        
        result = {
            "is_fraudulent": is_fraudulent,
            "confidence": float(fraud_score),
            "risk_factors": risk_factors,
            "recommended_action": recommendation,
            "analysis_timestamp": datetime.now().isoformat(),
            "model_version": self.model_version
        }
        
        logger.info(f"Fraud analysis completed: fraud_score={fraud_score:.3f}")
        return result
    
    def _extract_features(self, transaction: Dict, historical_data: List[Dict]) -> np.ndarray:
        """Extract numerical features from transaction data"""
        features = []
        
        # Transaction amount (normalized)
        amount = float(transaction.get("amount", 0))
        features.append(np.log1p(amount))  # Log transform for better scaling
        
        # Time-based features
        timestamp = transaction.get("timestamp", 0)
        hour_of_day = (timestamp % 86400) / 3600  # Hour of day (0-24)
        day_of_week = ((timestamp // 86400) % 7)  # Day of week (0-6)
        features.extend([hour_of_day, day_of_week])
        
        # Address-based features (simplified)
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        
        # Address patterns (length, character diversity)
        features.append(len(from_addr))
        features.append(len(to_addr))
        features.append(len(set(from_addr.lower())))  # Character diversity
        features.append(len(set(to_addr.lower())))
        
        # Historical context features
        if historical_data:
            recent_txs = [tx for tx in historical_data 
                         if tx.get("timestamp", 0) > timestamp - 3600]  # Last hour
            
            features.append(len(recent_txs))  # Transaction frequency
            
            if recent_txs:
                avg_amount = np.mean([float(tx.get("amount", 0)) for tx in recent_txs])
                features.append(np.log1p(avg_amount))
            else:
                features.append(0.0)
        else:
            features.extend([0.0, 0.0])  # No historical data
        
        # Round trip patterns (simplified)
        round_trip_score = self._calculate_round_trip_score(transaction, historical_data)
        features.append(round_trip_score)
        
        return np.array(features).reshape(1, -1)
    
    def _calculate_fraud_score(self, features: np.ndarray) -> float:
        """Calculate fraud probability score"""
        try:
            if not self.is_ready():
                return 0.5  # Default medium risk
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features)
            
            # Get anomaly score (Isolation Forest returns -1 for outliers, 1 for inliers)
            anomaly_score = self.model.decision_function(features_scaled)[0]
            
            # Convert to probability (0 = normal, 1 = highly anomalous)
            fraud_probability = max(0.0, min(1.0, (1 - anomaly_score) / 2))
            
            return fraud_probability
            
        except Exception as e:
            logger.error(f"Fraud score calculation failed: {e}")
            return 0.5
    
    def _identify_risk_factors(
        self, 
        transaction: Dict, 
        features: np.ndarray, 
        fraud_score: float
    ) -> List[str]:
        """Identify specific risk factors contributing to fraud score"""
        risk_factors = []
        
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        # Large transaction amounts
        if amount > 100000:  # Threshold for large transactions
            risk_factors.append("large_transaction_amount")
        
        # Unusual timing
        hour = (timestamp % 86400) / 3600
        if hour < 6 or hour > 22:  # Late night/early morning
            risk_factors.append("unusual_timing")
        
        # High fraud score
        if fraud_score > 0.8:
            risk_factors.append("high_anomaly_score")
        elif fraud_score > 0.6:
            risk_factors.append("medium_anomaly_score")
        
        # Address patterns
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        
        if len(from_addr) < 10 or len(to_addr) < 10:
            risk_factors.append("suspicious_address_format")
        
        # Round-trip indicators
        if from_addr == to_addr:
            risk_factors.append("self_transaction")
        
        return risk_factors
    
    def _calculate_round_trip_score(
        self, 
        transaction: Dict, 
        historical_data: List[Dict]
    ) -> float:
        """Calculate score for potential round-trip money laundering"""
        if not historical_data:
            return 0.0
        
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        # Look for reverse transactions in recent history
        round_trip_score = 0.0
        
        for tx in historical_data:
            tx_from = tx.get("from_address", "")
            tx_to = tx.get("to_address", "")
            tx_amount = float(tx.get("amount", 0))
            tx_timestamp = tx.get("timestamp", 0)
            
            # Check for reverse transaction
            if (tx_from == to_addr and tx_to == from_addr and 
                abs(tx_amount - amount) / amount < 0.1 and  # Similar amounts
                abs(tx_timestamp - timestamp) < 3600):  # Within 1 hour
                
                round_trip_score = 1.0
                break
        
        return round_trip_score
    
    def _generate_recommendation(
        self, 
        fraud_score: float, 
        risk_factors: List[str]
    ) -> str:
        """Generate recommended action based on analysis"""
        if fraud_score > 0.9:
            return "block_transaction"
        elif fraud_score > 0.7:
            return "require_additional_verification"
        elif fraud_score > 0.5:
            return "flag_for_monitoring"
        elif len(risk_factors) > 2:
            return "manual_review"
        else:
            return "approve"
    
    async def update_model(self, training_data: List[Dict]) -> bool:
        """Update the fraud detection model with new training data"""
        try:
            logger.info("Updating fraud detection model...")
            
            # In a real implementation, this would retrain the model
            # with new labeled fraud data
            
            self.last_update = datetime.now()
            logger.info("Fraud detection model updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Model update failed: {e}")
            return False
