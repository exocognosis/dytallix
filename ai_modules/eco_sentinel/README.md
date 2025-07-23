# Economic Sentinel - Economic Risk Forecasting Module

## Overview
The Economic Sentinel module provides economic risk forecasting and early warning systems using Random Forest and ARIMA time series models. It monitors economic indicators, predicts market volatility, and identifies potential economic threats to the network.

## Architecture
- **Primary Model**: Random Forest for multi-factor risk assessment
- **Secondary Model**: ARIMA for time series forecasting
- **Framework**: Z = (X - μ)/σ (Z-score for anomaly detection)
- **Training**: 30-100 epochs for ensemble models

## Features
- Economic risk scoring
- Market volatility prediction
- Liquidity crisis detection
- Inflation impact analysis
- Correlation analysis across assets
- Early warning alerts

## Risk Categories
- **Market Risk**: Price volatility, liquidity issues, market manipulation
- **Credit Risk**: Lending protocols, collateralization ratios, defaults
- **Operational Risk**: Network congestion, validator issues, governance risks
- **Systemic Risk**: Cross-chain contagion, regulatory changes, macroeconomic events

## Input Format
```json
{
  "market_data": {
    "token_price_history": [float],
    "volume_history": [float],
    "market_cap": float,
    "circulating_supply": float,
    "trading_pairs": [
      {
        "pair": string,
        "volume_24h": float,
        "price_change": float,
        "liquidity": float
      }
    ]
  },
  "network_metrics": {
    "total_value_locked": float,
    "staking_ratio": float,
    "validator_count": int,
    "transaction_volume": float,
    "gas_fees_collected": float,
    "inflation_rate": float
  },
  "external_factors": {
    "btc_price": float,
    "eth_price": float,
    "defi_tvl_total": float,
    "regulatory_sentiment": float,
    "macro_economic_indicators": {
      "interest_rates": float,
      "inflation_rate": float,
      "stock_market_performance": float
    }
  }
}
```

## Output Format
```json
{
  "risk_assessment": {
    "overall_risk_score": float,
    "risk_level": "low|medium|high|critical",
    "confidence": float,
    "risk_breakdown": {
      "market_risk": float,
      "credit_risk": float,
      "operational_risk": float,
      "systemic_risk": float
    }
  },
  "forecasts": {
    "price_forecast": {
      "1_day": float,
      "7_day": float,
      "30_day": float,
      "confidence_intervals": [[float, float]]
    },
    "volatility_forecast": {
      "expected_volatility": float,
      "volatility_trend": "increasing|decreasing|stable"
    },
    "liquidity_forecast": {
      "liquidity_score": float,
      "liquidity_risk": "low|medium|high"
    }
  },
  "alerts": [
    {
      "type": "warning|critical",
      "category": string,
      "message": string,
      "probability": float,
      "timeframe": string,
      "recommended_actions": [string]
    }
  ],
  "correlations": {
    "btc_correlation": float,
    "eth_correlation": float,
    "market_correlation": float,
    "network_correlation": float
  }
}
```

## Usage
```python
from eco_sentinel.train import EconomicSentinelModel

# Initialize and train
model = EconomicSentinelModel()
model.train(data_path="data/economic_data.csv")

# Assess risks
result = model.assess_risk(market_data)
```

## Training
- Run `python train.py` to train Random Forest and ARIMA models
- Economic data is synthesized based on historical patterns if not available
- Models are saved in the `models/` directory
- Forecasting accuracy metrics are logged to `metrics.json`

## Configuration
See `config.json` for model parameters, risk thresholds, forecasting horizons, and alert settings.

## Dependencies
See `requirements.txt` for required packages including Random Forest and time series libraries.