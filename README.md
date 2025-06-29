# Cipher AI Agents - Vault Commitment Analysis

A sophisticated AI-powered commitment analysis system for supported crypto tokens, designed to help users make informed decisions about locking their crypto assets for behavioral improvement and long-term holding strategies.

## 🔐 What is Cipher AI Agents?

Cipher AI Agents is an intelligent system that analyzes crypto vault commitment proposals using real market data, behavioral psychology insights, and the Fear & Greed Index. It provides comprehensive analysis for users who want to encode their commitment into secure vaults, improving their trading behavior and avoiding emotional decision-making.

## ✨ Key Features

### 🎯 Commitment Analysis
- **Time-based commitments**: Analyze locking tokens for specific durations (days, weeks, months, years)
- **Price-based commitments**: Set price targets for automatic unlocking (e.g., "lock until price reaches $50 or $30")
- **Real-time market data**: Uses live price feeds and historical data for accurate analysis
- **Multi-network support**: Native support for multiple blockchain networks

### 📊 Wallet Analysis
- **Risk assessment**: Comprehensive risk scoring (0-100) based on trading patterns
- **Confidence analysis**: Percentage-based confidence in the analysis results
- **Risk profiling**: LOW_RISK, MODERATE_RISK, HIGH_RISK, EXTREME_RISK categorization
- **Market sentiment**: Real-time bullish/bearish analysis with trend direction
- **Trading factors**: Analysis of hold times, trade frequency, volatility tolerance, and diversification
- **Risk tolerance**: CONSERVATIVE, MODERATE, AGGRESSIVE, EXTREME classification
- **Personalized recommendations**: AI-generated suggestions for improving trading behavior

### 🏦 Community Vaults Analysis
- **Community insights**: Analysis of the last 10 vault lock data from all users
- **Success rate tracking**: Monitor commitment completion rates and emergency withdrawals
- **Behavioral patterns**: Identify common commitment durations and amounts
- **Token preferences**: Track which assets users prefer to lock (ETH/AVAX)
- **Cross-chain analysis**: Compare vault patterns across Ethereum and Avalanche networks
- **Market correlation**: Analyze vault creation patterns vs market conditions
- **Community recommendations**: AI-generated suggestions for improving community engagement

### 📊 Advanced Analytics
- **Commitment scoring**: 0-100 score based on multiple factors
- **Risk assessment**: LOW, MODERATE, HIGH, EXTREME risk levels
- **Behavioral insights**: Psychology-based recommendations for better trading habits
- **Market sentiment analysis**: Integration with Fear & Greed Index
- **Price predictions**: AI-powered price forecasting with confidence levels
- **Expected returns**: Detailed ROI analysis with best/worst case scenarios

### 🪙 Supported Tokens
- **AVAX** - Native Avalanche token
- **ETH** - Native Ethereum token
- **MONAD** - Native Monad token

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Eliza CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cipher-ai-agents

# Install dependencies
bun install

# Start the development server
bun run dev
```

### API Usage

#### Time-based Commitment Analysis
```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I want to lock 10 AVAX for 3 months"
  }'
```

#### Price-based Commitment Analysis
```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Lock 2 ETH until price reaches $5000 or $3000"
  }'
```

#### Wallet Analysis
```bash
curl -X POST http://localhost:3000/api/wallet-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Analyze my wallet trading history and provide risk assessment",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

#### Community Vaults Analysis
```bash
curl -X POST http://localhost:3000/api/vaults-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Analyze community vault patterns and provide insights"
  }'
```

## 📡 API Response Format

### Commitment Analysis Response
The API returns structured data with AI analysis:

```json
{
  "success": true,
  "data": {
    "response": "AI formatted analysis text",
    "action": "CIPHER_ANALYZE_COMMITMENT",
    "character": "Cipher Advisor",
    "analysis": {
      "score": 75,
      "recommendation": "RECOMMENDED",
      "factors": ["Token is supported by FUMVault", "..."],
      "riskLevel": "MODERATE",
      "behavioralInsights": ["3-6 month commitments align with market cycles", "..."],
      "marketConditions": ["Asset trading below recent highs", "..."],
      "suggestedOptimizations": ["Consider staking for additional yield", "..."],
      "fearGreedInsights": ["Fear periods historically mark bottoms", "..."],
      "expectedReturn": {
        "duration": 90,
        "durationUnit": "days",
        "initialInvestment": 1000,
        "predictedValue": 1100,
        "expectedReturn": 100,
        "expectedReturnPercentage": 10,
        "bestCaseScenario": 1200,
        "worstCaseScenario": 800,
        "confidence": 0.7
      },
      "pricePredictions": [...]
    },
    "amount": 10,
    "tokenSymbol": "AVAX",
    "duration": 90,
    "unit": "days",
    "fearAndGreed": {
      "value": 65,
      "classification": "greed",
      "timestamp": 1751028483696
    }
  }
}
```

### Wallet Analysis Response
The wallet analysis endpoint returns comprehensive trading behavior insights:

```json
{
  "success": true,
  "data": {
    "response": "AI formatted wallet analysis text",
    "action": "CIPHER_ANALYZE_WALLET",
    "character": "Cipher Advisor",
    
    // 1. Risk Score (0-100)
    "riskScore": 65.5,
    
    // 2. Confidence Percentage (50-95)
    "confidencePercentage": 78.2,
    
    // 3. Risk Profile
    "riskProfile": "HIGH_RISK",
    
    // 4. Current Market Analysis
    "marketAnalysis": {
      "sentiment": "BULLISH",
      "trendDirection": "UPWARD",
      "aiRecommendation": "Market sentiment is bullish with positive momentum. Consider gradual position building while maintaining risk management protocols."
    },
    
    // 5. User Trading Factors
    "userTradingFactors": {
      "averageHoldTime": 12.5,
      "tradeFrequency": 8.2,
      "volatilityTolerance": 75.3,
      "diversificationScore": 45.8,
      "emotionalTradingIndicators": [
        "Frequent trading during market volatility",
        "Selling during price dips",
        "Buying during FOMO periods"
      ],
      "ethActivity": 65.2,
      "avaxActivity": 34.8
    },
    
    // 6. Risk Tolerance
    "riskTolerance": "AGGRESSIVE",
    
    // 7. Personalized Recommendations
    "personalizedRecommendations": [
      "🔴 **Immediate Risk Management Needed**: Your trading patterns indicate high risk. Consider implementing strict stop-losses and reducing position sizes.",
      "📊 **Reduce Trading Frequency**: High-frequency trading may lead to increased transaction costs and emotional decisions. Consider longer holding periods.",
      "⏰ **Extend Holding Periods**: Short holding periods often indicate emotional trading. Consider implementing a minimum 30-day holding rule.",
      "🌐 **Improve Diversification**: Your portfolio appears concentrated. Consider spreading investments across different assets and sectors.",
      "🧠 **Emotional Trading Alert**: Consider using commitment vaults to lock positions and prevent emotional decisions during market volatility."
    ],
    
    // Additional metadata
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "marketData": {
      "fearGreedIndex": 65,
      "marketCapChange24h": 2.5,
      "btcChange24h": 1.8,
      "ethChange24h": 2.1,
      "solChange24h": 3.2
    }
  }
}
```

### Vaults Analysis Response
The vaults analysis endpoint returns comprehensive community insights:

```json
{
  "success": true,
  "data": {
    "response": "AI formatted vaults analysis text",
    "action": "CIPHER_ANALYZE_VAULTS",
    "character": "Cipher Advisor",
    
    // Overview Statistics
    "totalVaults": 10,
    "activeVaults": 3,
    "completedVaults": 6,
    "emergencyWithdrawnVaults": 1,
    "successRate": 90.0,
    
    // Value Metrics
    "totalValueLocked": 15.5,
    "averageAmount": 1.55,
    "averageLockDuration": 45.2,
    
    // Time Distribution
    "timeDistribution": {
      "shortTerm": 2,
      "mediumTerm": 5,
      "longTerm": 3
    },
    
    // Top Tokens
    "topTokens": [
      {
        "token": "ETH",
        "count": 6,
        "totalValue": 8.2
      },
      {
        "token": "AVAX",
        "count": 4,
        "totalValue": 7.3
      }
    ],
    
    // Insights
    "commonPatterns": [
      "Medium-term commitments (30-90 days) are the preferred choice",
      "ETH is the most locked asset with 6 vaults",
      "Cross-chain distribution: 60% ETH, 40% AVAX",
      "Users prefer small amounts for testing commitment mechanisms"
    ],
    "riskInsights": [
      "High success rate indicates strong community commitment to behavioral improvement",
      "1 emergency withdrawals detected - users value capital preservation over penalties",
      "3 active vaults show ongoing commitment to behavioral improvement"
    ],
    "behavioralInsights": [
      "Medium average lock duration suggests balanced approach to commitment",
      "Short-term vaults suggest users are testing the commitment mechanism",
      "Long-term vaults indicate serious behavioral improvement intentions"
    ],
    "marketInsights": [
      "Recent vaults created during fear periods - users seeking behavioral control in volatile markets"
    ],
    "recommendations": [
      "📈 **Encourage Long-term Commitments**: Provide incentives for longer lock periods",
      "💰 **Increase Commitment Amounts**: Users may benefit from larger commitments for better behavioral impact",
      "📊 **Community Education**: Share success stories and behavioral improvement metrics"
    ],
    
    // Additional metadata
    "vaultsData": [...],
    "marketData": {
      "fearGreedIndex": 35,
      "marketCapChange24h": -1.2
    }
  }
}
```

## 🧠 How It Works

### 1. Input Processing
The system parses user input to identify:
- Token amount and symbol
- Commitment duration or price targets
- General market queries

### 2. Token Validation
- Validates tokens against supported token list
- Checks for reliable price data availability
- Verifies token legitimacy and network support

### 3. Market Data Analysis
- Fetches real-time price data
- Analyzes historical price movements
- Calculates volatility and drawdown metrics
- Integrates Fear & Greed Index sentiment

### 4. Behavioral Analysis
- Evaluates commitment duration psychology
- Assesses portfolio allocation impact
- Provides behavioral improvement insights
- Suggests optimization strategies

### 5. Risk Assessment
- Calculates comprehensive risk scores
- Identifies potential market risks
- Provides risk mitigation recommendations
- Evaluates opportunity costs

## 🛠️ Technical Architecture

### Core Components
- **API Routes** (`src/api-routes.ts`): REST API endpoints
- **Actions** (`src/actions/commitmentAnalysis.ts`): Core analysis logic
- **Services** (`src/services/`): External data providers
  - `supportedTokenMapping.ts`: Token validation and support
  - `marketData.ts`: Market data and Fear & Greed Index
  - `tokenMapping.ts`: Base token mapping functionality
- **Utils** (`src/utils/commitmentUtils.ts`): Analysis calculations
- **Types** (`src/types.ts`): TypeScript type definitions

### Key Dependencies
- **@elizaos/core**: AI agent framework
- **Multi-network support**: Token validation across networks
- **Market data APIs**: Real-time crypto data
- **Fear & Greed Index**: Market sentiment analysis

### Analysis Algorithms
- **Volatility calculation**: Historical price movement analysis
- **Max drawdown**: Risk assessment metrics
- **Price predictions**: AI-powered forecasting models
- **Commitment scoring**: Multi-factor evaluation system

## 🔧 Configuration

### Environment Variables
```bash
# Market data API keys
COINGECKO_API_KEY=your_api_key

# Model Providers
OPENAI_API_KEY=your_api_key

# Postgres Url (Optional)
POSTGRES_URL=your_postgres_url
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.