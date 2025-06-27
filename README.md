# FUM AI Agents - Vault Locking Commitment Analysis

A sophisticated AI-powered commitment analysis system for Avalanche network tokens, designed to help users make informed decisions about locking their crypto assets for behavioral improvement and long-term holding strategies.

## 🏔️ What is FUM AI Agents?

FUM AI Agents is an intelligent system that analyzes crypto vault locking commitment proposals using real market data, behavioral psychology insights, and the Fear & Greed Index. It provides comprehensive analysis for users who want to lock their Avalanche tokens to improve their trading behavior and avoid emotional decision-making.

## ✨ Key Features

### 🎯 Commitment Analysis
- **Time-based commitments**: Analyze locking tokens for specific durations (days, weeks, months, years)
- **Price-based commitments**: Set price targets for automatic unlocking (e.g., "lock until price reaches $50 or $30")
- **Real-time market data**: Uses live price feeds and historical data for accurate analysis
- **Avalanche network integration**: Native support for Avalanche C-Chain tokens

### 📊 Advanced Analytics
- **Commitment scoring**: 0-100 score based on multiple factors
- **Risk assessment**: LOW, MODERATE, HIGH, EXTREME risk levels
- **Behavioral insights**: Psychology-based recommendations for better trading habits
- **Market sentiment analysis**: Integration with Fear & Greed Index
- **Price predictions**: AI-powered price forecasting with confidence levels
- **Expected returns**: Detailed ROI analysis with best/worst case scenarios

### 🏔️ Supported Avalanche Tokens
- **AVAX** - Native Avalanche token (Chainlink price feed)
- **WAVAX** - Wrapped AVAX for DeFi (Chainlink price feed)
- **USDC.E** - Avalanche Bridged USDC (Chainlink price feed)
- **USDT.E** - Tether Avalanche Bridged (Chainlink price feed)
- **JOE** - JoeToken (limited price feed support)
- **PNG** - Pangolin (limited price feed support)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Eliza CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fum-ai-agents

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
    "text": "Lock 5 AVAX until price reaches $50 or $30"
  }'
```

## 📡 API Response Format

The API returns structured data with AI analysis:

```json
{
  "success": true,
  "data": {
    "response": "AI formatted analysis text",
    "action": "FUM_ANALYZE_COMMITMENT",
    "character": "FUM Advisor",
    "analysis": {
      "score": 75,
      "recommendation": "RECOMMENDED",
      "factors": ["Token has reliable Chainlink price feed", "..."],
      "riskLevel": "MODERATE",
      "behavioralInsights": ["3-6 month commitments align with market cycles", "..."],
      "marketConditions": ["Asset trading below recent highs", "..."],
      "suggestedOptimizations": ["Consider staking AVAX for yield", "..."],
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

## 🧠 How It Works

### 1. Input Processing
The system parses user input to identify:
- Token amount and symbol
- Commitment duration or price targets
- General market queries

### 2. Token Validation
- Validates tokens on Avalanche C-Chain
- Checks for Chainlink price feed availability
- Verifies smart contract existence

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
- **Utils** (`src/utils/commitmentUtils.ts`): Analysis calculations
- **Types** (`src/types.ts`): TypeScript type definitions

### Key Dependencies
- **@elizaos/core**: AI agent framework
- **Avalanche integration**: Token validation and price feeds
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