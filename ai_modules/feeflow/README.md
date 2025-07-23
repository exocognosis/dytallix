# FeeFlow Optimizer - Gas Fee Prediction Module

## Overview
The FeeFlow Optimizer predicts gas fees and optimizes network congestion using LSTM neural networks combined with Reinforcement Learning (Policy Gradient methods). It provides real-time fee predictions and network optimization recommendations.

## Architecture
- **Primary Model**: LSTM for time series prediction of gas fees
- **Secondary Model**: Policy Gradient RL for optimization decisions
- **Framework**: ∇θJ(θ) = E[∇θ log πθ(a|s) R] (Policy Gradient)
- **Training**: 100-300 epochs for LSTM, 10k+ episodes for RL

## Features
- Real-time gas fee prediction
- Network congestion forecasting
- Dynamic fee optimization
- Historical pattern analysis
- Multi-horizon predictions (short/medium/long term)
- Congestion-based dynamic pricing

## Input Format
```json
{
  "network_state": {
    "current_gas_price": float,
    "pending_transactions": int,
    "block_utilization": float,
    "mempool_size": int,
    "recent_blocks": [block_data],
    "time_features": {
      "hour": int,
      "day_of_week": int,
      "is_weekend": bool
    }
  }
}
```

## Output Format
```json
{
  "predictions": {
    "next_block": float,
    "next_5_blocks": [float],
    "next_hour": float,
    "confidence_interval": [float, float]
  },
  "optimization": {
    "recommended_fee": float,
    "urgency_multiplier": float,
    "congestion_level": "low|medium|high|critical",
    "optimal_timing": "immediate|delay_5min|delay_30min"
  },
  "market_insights": {
    "trend": "increasing|decreasing|stable",
    "volatility": float,
    "seasonal_factor": float
  }
}
```

## Usage
```python
from feeflow.train import FeeFlowModel

# Initialize and train
model = FeeFlowModel()
model.train(data_path="data/gas_price_history.csv")

# Predict fees
result = model.predict(network_state)
```

## Training
- Run `python train.py` to train both LSTM and RL models
- Historical gas price data is synthesized if not available
- Models are saved in the `models/` directory
- Training metrics are logged to `metrics.json`

## Configuration
See `config.json` for LSTM architecture, RL parameters, prediction horizons, and optimization settings.

## Dependencies
See `requirements.txt` for required packages including PyTorch for neural networks.