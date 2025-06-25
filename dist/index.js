// src/index.ts
import {
  logger
} from "@elizaos/core";

// src/services/tokenMapping.ts
var TokenMappingService = class {
  coingeckoKey;
  tokenCache = /* @__PURE__ */ new Map();
  constructor(runtime) {
    this.coingeckoKey = runtime.getSetting("COINGECKO_API_KEY") || "";
  }
  getCoingeckoUrl(endpoint, isKeyRequired = true) {
    const baseUrl = isKeyRequired ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${this.coingeckoKey}` : "https://api.coingecko.com/api/v3";
    return `${baseUrl}/${endpoint}`;
  }
  async getTokenId(symbol) {
    const normalizedSymbol = symbol.toLowerCase();
    if (this.tokenCache.has(normalizedSymbol)) {
      return this.tokenCache.get(normalizedSymbol);
    }
    const commonTokens = this.getCommonTokens();
    if (commonTokens[normalizedSymbol]) {
      this.tokenCache.set(normalizedSymbol, commonTokens[normalizedSymbol]);
      return commonTokens[normalizedSymbol];
    }
    try {
      const url = this.getCoingeckoUrl("coins/list", false);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch coins list: ${response.status}`);
      }
      const coins = await response.json();
      const exactMatch = coins.find((coin) => coin.symbol.toLowerCase() === normalizedSymbol);
      if (exactMatch) {
        this.tokenCache.set(normalizedSymbol, exactMatch.id);
        return exactMatch.id;
      }
      const nameMatch = coins.find(
        (coin) => coin.name.toLowerCase() === normalizedSymbol || coin.name.toLowerCase().replace(/\s+/g, "") === normalizedSymbol
      );
      if (nameMatch) {
        this.tokenCache.set(normalizedSymbol, nameMatch.id);
        return nameMatch.id;
      }
      const partialMatches = coins.filter(
        (coin) => coin.symbol.toLowerCase().includes(normalizedSymbol) || normalizedSymbol.includes(coin.symbol.toLowerCase()) || coin.name.toLowerCase().includes(normalizedSymbol) || normalizedSymbol.includes(coin.name.toLowerCase())
      );
      if (partialMatches.length > 0) {
        const bestMatch = partialMatches[0];
        this.tokenCache.set(normalizedSymbol, bestMatch.id);
        return bestMatch.id;
      }
      return null;
    } catch (error) {
      console.error("Error fetching token ID:", error);
      return null;
    }
  }
  async getTokenData(symbol) {
    const tokenId = await this.getTokenId(symbol);
    if (!tokenId) {
      return null;
    }
    try {
      const url = this.getCoingeckoUrl(`coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`, false);
      const response = await fetch(url);
      if (!response.ok) {
        console.error("Failed to fetch token data:", response.status, response.statusText);
        throw new Error(`Failed to fetch token data: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching token data:", error);
      return null;
    }
  }
  async getTokenPrice(symbol) {
    const tokenId = await this.getTokenId(symbol);
    if (!tokenId) {
      return null;
    }
    try {
      const url = this.getCoingeckoUrl(`simple/price?ids=${tokenId}&vs_currencies=usd`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch token price: ${response.status}`);
      }
      const data = await response.json();
      return data[tokenId]?.usd || null;
    } catch (error) {
      console.error("Error fetching token price:", error);
      return null;
    }
  }
  async getHistoricalData(symbol, days) {
    const tokenId = await this.getTokenId(symbol);
    if (!tokenId) {
      return null;
    }
    try {
      const url = this.getCoingeckoUrl(`coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`, false);
      console.log("Fetching historical data from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }
      const data = await response.json();
      return data.prices;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return null;
    }
  }
  getCommonTokens() {
    return {
      "btc": "bitcoin",
      "bitcoin": "bitcoin",
      "eth": "ethereum",
      "ethereum": "ethereum",
      "usdt": "tether",
      "tether": "tether",
      "usdc": "usd-coin",
      "usd-coin": "usd-coin",
      "bnb": "binancecoin",
      "binancecoin": "binancecoin",
      "sol": "solana",
      "solana": "solana",
      "ada": "cardano",
      "cardano": "cardano",
      "avax": "avalanche-2",
      "avalanche": "avalanche-2",
      "dot": "polkadot",
      "polkadot": "polkadot",
      "atom": "cosmos",
      "cosmos": "cosmos",
      "etc": "ethereum-classic",
      "ethereum-classic": "ethereum-classic",
      "matic": "matic-network",
      "polygon": "matic-network",
      "link": "chainlink",
      "chainlink": "chainlink",
      "uni": "uniswap",
      "uniswap": "uniswap",
      "ltc": "litecoin",
      "litecoin": "litecoin",
      "bch": "bitcoin-cash",
      "bitcoin-cash": "bitcoin-cash",
      "xrp": "ripple",
      "ripple": "ripple",
      "doge": "dogecoin",
      "dogecoin": "dogecoin",
      "shib": "shiba-inu",
      "shiba-inu": "shiba-inu",
      "trx": "tron",
      "tron": "tron"
    };
  }
  async getSuggestedTokens(symbol) {
    const normalizedSymbol = symbol.toLowerCase();
    try {
      const url = this.getCoingeckoUrl("coins/list");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch coins list: ${response.status}`);
      }
      const coins = await response.json();
      const suggestions = coins.filter(
        (coin) => coin.symbol.toLowerCase().includes(normalizedSymbol) || coin.name.toLowerCase().includes(normalizedSymbol)
      ).slice(0, 10);
      return suggestions;
    } catch (error) {
      console.error("Error fetching suggested tokens:", error);
      return [];
    }
  }
};

// src/services/marketData.ts
var MarketDataService = class {
  coingeckoKey;
  constructor(runtime) {
    this.coingeckoKey = runtime.getSetting("COINGECKO_API_KEY") || "";
  }
  getCoingeckoUrl(endpoint) {
    const baseUrl = this.coingeckoKey ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${this.coingeckoKey}` : "https://api.coingecko.com/api/v3";
    return `${baseUrl}/${endpoint}`;
  }
  async getMarketData() {
    try {
      const fearGreedUrl = "https://api.alternative.me/fng/";
      const fearGreedResponse = await fetch(fearGreedUrl);
      const fearGreedData = await fearGreedResponse.json();
      const pricesUrl = this.getCoingeckoUrl("simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true");
      const pricesResponse = await fetch(pricesUrl);
      const pricesData = await pricesResponse.json();
      const sentimentUrl = this.getCoingeckoUrl("global");
      const sentimentResponse = await fetch(sentimentUrl);
      const sentimentData = await sentimentResponse.json();
      const fearGreedIndex = parseInt(fearGreedData.data[0].value);
      const marketCapChange24h = sentimentData.data?.market_cap_change_percentage_24h_usd || 0;
      let sentiment = "neutral";
      if (fearGreedIndex >= 75) sentiment = "extreme greed";
      else if (fearGreedIndex >= 60) sentiment = "greed";
      else if (fearGreedIndex >= 40) sentiment = "neutral";
      else if (fearGreedIndex >= 25) sentiment = "fear";
      else sentiment = "extreme fear";
      let volatility = "low";
      const absChange = Math.abs(marketCapChange24h);
      if (absChange > 10) volatility = "extreme";
      else if (absChange > 5) volatility = "high";
      else if (absChange > 2) volatility = "moderate";
      else volatility = "low";
      return {
        btc: pricesData.bitcoin?.usd || 65e3,
        eth: pricesData.ethereum?.usd || 3500,
        sol: pricesData.solana?.usd || 120,
        sentiment,
        volatility,
        fearGreedIndex,
        marketCapChange24h,
        btcChange24h: pricesData.bitcoin?.usd_24h_change || 0,
        ethChange24h: pricesData.ethereum?.usd_24h_change || 0,
        solChange24h: pricesData.solana?.usd_24h_change || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error fetching market data:", error);
      return null;
    }
  }
  async getFearGreedData() {
    try {
      const response = await fetch("https://api.alternative.me/fng/");
      if (!response.ok) {
        throw new Error(`Failed to fetch Fear & Greed Index: ${response.status}`);
      }
      const data = await response.json();
      const fearGreedData = data.data[0];
      return {
        value: parseInt(fearGreedData.value),
        classification: fearGreedData.value_classification,
        timestamp: parseInt(fearGreedData.timestamp)
      };
    } catch (error) {
      console.error("Error fetching Fear & Greed Index:", error);
      return null;
    }
  }
  getMarketContextText(marketData) {
    return `\u{1F4CA} **Real-Time Market Conditions**

**Prices:** BTC $${marketData.btc.toLocaleString()} (${marketData.btcChange24h > 0 ? "+" : ""}${marketData.btcChange24h.toFixed(2)}%), ETH $${marketData.eth.toLocaleString()} (${marketData.ethChange24h > 0 ? "+" : ""}${marketData.ethChange24h.toFixed(2)}%)
**Sentiment:** ${marketData.sentiment.charAt(0).toUpperCase() + marketData.sentiment.slice(1)} (Fear & Greed: ${marketData.fearGreedIndex})
**Volatility:** ${marketData.volatility.charAt(0).toUpperCase() + marketData.volatility.slice(1)} (24h Market Change: ${marketData.marketCapChange24h > 0 ? "+" : ""}${marketData.marketCapChange24h.toFixed(2)}%)`;
  }
  getBehavioralContext(marketData) {
    let context = "";
    if (marketData.sentiment === "extreme fear") {
      context += "\u2022 Extreme fear often marks market bottoms - good time for commitment strategies\n";
    } else if (marketData.sentiment === "extreme greed") {
      context += "\u2022 Extreme greed suggests potential market top - consider waiting\n";
    }
    if (marketData.volatility === "extreme") {
      context += "\u2022 High volatility - focus on risk management and shorter commitments\n";
    } else if (marketData.volatility === "low") {
      context += "\u2022 Low volatility - good environment for longer-term commitments\n";
    }
    return context;
  }
};

// src/actions/commitmentAnalysis.ts
var CommitmentAnalysisAction = {
  name: "FUM_ANALYZE_COMMITMENT",
  similes: ["CHECK_COMMITMENT", "VALIDATE_LOCK", "ANALYZE_VAULT", "RATE_COMMITMENT", "BEHAVIORAL_ANALYSIS", "MARKET_INSIGHTS"],
  description: "Analyzes commitment vault parameters using real market data and Fear & Greed Index, or provides general behavioral insights and market analysis",
  validate: async (runtime, message, state) => {
    return true;
  },
  handler: async (runtime, message, state, options, callback) => {
    try {
      const text = message.content?.text || "";
      const amountMatch = text.match(/(\d+\.?\d*)\s*(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)/i);
      const timeMatch = text.match(/(\d+)\s*(days?|months?|weeks?|years?)/i);
      const priceBasedPattern = text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+until\s+(?:either\s+)?(?:the\s+)?price\s+(?:goes\s+)?(?:up\s+)?to\s+\$?(\d+\.?\d*)\s+(?:or|and)\s+(?:price\s+)?(?:goes\s+)?(?:down\s+)?to\s+\$?(\d+\.?\d*)/i) || text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+until\s+(?:the\s+)?price\s+(?:reaches|hits)?\s*\$?(\d+\.?\d*)\s+or\s+\$?(\d+\.?\d*)/i) || text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+(?:until|till)\s+\$?(\d+\.?\d*)\s+or\s+\$?(\d+\.?\d*)/i);
      const tokenService = new TokenMappingService(runtime);
      const marketDataService = new MarketDataService(runtime);
      const marketData = await marketDataService.getMarketData();
      let fearGreedData = null;
      if (marketData) {
        fearGreedData = {
          value: marketData.fearGreedIndex,
          classification: marketData.sentiment,
          timestamp: marketData.timestamp
        };
      }
      if (priceBasedPattern) {
        const amount = parseFloat(priceBasedPattern[1]);
        const tokenSymbol = priceBasedPattern[2].toUpperCase();
        const upTarget = parseFloat(priceBasedPattern[3]);
        const downTarget = parseFloat(priceBasedPattern[4]);
        const tokenData = await tokenService.getTokenData(tokenSymbol);
        if (!tokenData) {
          const suggestions = await tokenService.getSuggestedTokens(tokenSymbol);
          const commonTokens = tokenService.getCommonTokens();
          let errorMessage = `I couldn't find data for "${tokenSymbol}". `;
          if (suggestions.length > 0) {
            errorMessage += `Did you mean one of these?
`;
            suggestions.slice(0, 5).forEach((suggestion) => {
              errorMessage += `\u2022 ${suggestion.symbol.toUpperCase()} (${suggestion.name})
`;
            });
          } else {
            errorMessage += `Here are some popular tokens you can use:
`;
            Object.keys(commonTokens).slice(0, 10).forEach((symbol) => {
              errorMessage += `\u2022 ${symbol.toUpperCase()}
`;
            });
          }
          errorMessage += `
Please try again with a valid token symbol.`;
          await callback?.({
            text: errorMessage,
            thought: `Token ${tokenSymbol} not found in CoinGecko database`,
            actions: ["FUM_ANALYZE_COMMITMENT"]
          });
          return false;
        }
        const historicalData = await tokenService.getHistoricalData(tokenSymbol, 365);
        const analysis = await analyzePriceBasedCommitment(
          tokenData,
          historicalData,
          amount,
          tokenSymbol,
          upTarget,
          downTarget,
          fearGreedData
        );
        await callback?.({
          text: formatPriceBasedCommitmentResponse(analysis, fearGreedData),
          thought: `Analyzed price-based commitment: ${amount} ${tokenSymbol} until price reaches $${upTarget} or $${downTarget} with real market data and Fear & Greed Index`,
          actions: ["FUM_ANALYZE_COMMITMENT"],
          metadata: {
            amount,
            token: tokenSymbol,
            upTarget,
            downTarget,
            analysis,
            fearGreedIndex: fearGreedData?.value || null,
            marketData
          }
        });
        return true;
      }
      if (amountMatch && timeMatch) {
        const amount = parseFloat(amountMatch[1]);
        const tokenSymbol = amountMatch[2].toUpperCase();
        const duration = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        let durationInDays = duration;
        if (unit.includes("week")) durationInDays *= 7;
        if (unit.includes("month")) durationInDays *= 30;
        if (unit.includes("year")) durationInDays *= 365;
        const tokenData = await tokenService.getTokenData(tokenSymbol);
        if (!tokenData) {
          const suggestions = await tokenService.getSuggestedTokens(tokenSymbol);
          const commonTokens = tokenService.getCommonTokens();
          let errorMessage = `I couldn't find data for "${tokenSymbol}". `;
          if (suggestions.length > 0) {
            errorMessage += `Did you mean one of these?
`;
            suggestions.slice(0, 5).forEach((suggestion) => {
              errorMessage += `\u2022 ${suggestion.symbol.toUpperCase()} (${suggestion.name})
`;
            });
          } else {
            errorMessage += `Here are some popular tokens you can use:
`;
            Object.keys(commonTokens).slice(0, 10).forEach((symbol) => {
              errorMessage += `\u2022 ${symbol.toUpperCase()}
`;
            });
          }
          errorMessage += `
Please try again with a valid token symbol.`;
          await callback?.({
            text: errorMessage,
            thought: `Token ${tokenSymbol} not found in CoinGecko database`,
            actions: ["FUM_ANALYZE_COMMITMENT"]
          });
          return false;
        }
        const historicalData = await tokenService.getHistoricalData(tokenSymbol, Math.max(365, durationInDays));
        const analysis = await analyzeCommitmentWithRealData(
          tokenData,
          historicalData,
          amount,
          durationInDays,
          tokenSymbol,
          fearGreedData
        );
        await callback?.({
          text: formatCommitmentResponse(analysis, amount, tokenSymbol, duration, unit, tokenData, fearGreedData),
          thought: `Analyzed commitment: ${amount} ${tokenSymbol} for ${duration} ${unit} with real market data, Fear & Greed Index, and price predictions`,
          actions: ["FUM_ANALYZE_COMMITMENT"],
          metadata: {
            amount,
            token: tokenSymbol,
            durationInDays,
            score: analysis.score,
            recommendation: analysis.recommendation,
            riskLevel: analysis.riskLevel,
            fearGreedIndex: fearGreedData?.value || null,
            marketData,
            expectedReturn: analysis.expectedReturn,
            pricePredictions: analysis.pricePredictions
          }
        });
        return true;
      } else {
        await callback?.({
          text: formatGeneralAnalysis(text, fearGreedData, marketData),
          thought: `Provided general market analysis and behavioral insights for user query: "${text}"`,
          actions: ["FUM_ANALYZE_COMMITMENT"],
          metadata: {
            fearGreedIndex: fearGreedData?.value || null,
            marketData,
            analysisType: "general"
          }
        });
        return true;
      }
    } catch (error) {
      console.error("Error in commitment analysis:", error);
      await callback?.({
        text: "I encountered an error while analyzing your request. Please try again.",
        thought: `Error: ${error.message}`,
        actions: ["FUM_ANALYZE_COMMITMENT"]
      });
      return false;
    }
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "I want to lock 10 ETH for 3 months" }
      },
      {
        name: "{{agent}}",
        content: {
          text: "Analyzing your commitment proposal with real market data and Fear & Greed Index...",
          actions: ["FUM_ANALYZE_COMMITMENT"]
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I'm feeling FOMO about missing out on gains" }
      },
      {
        name: "{{agent}}",
        content: {
          text: "Providing behavioral analysis and market insights to help with FOMO concerns...",
          actions: ["FUM_ANALYZE_COMMITMENT"]
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "What's the current market sentiment?" }
      },
      {
        name: "{{agent}}",
        content: {
          text: "Analyzing current market conditions and behavioral insights...",
          actions: ["FUM_ANALYZE_COMMITMENT"]
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "I want to lock 3 ETH until either the price goes up to $3000 or goes down to $2000" }
      },
      {
        name: "{{agent}}",
        content: {
          text: "Analyzing your price-based commitment proposal...",
          actions: ["FUM_ANALYZE_COMMITMENT"]
        }
      }
    ]
  ]
};
async function analyzeCommitmentWithRealData(tokenData, historicalData, amount, durationInDays, tokenSymbol, fearGreedData) {
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;
  const totalValue = amount * currentPrice;
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const athChange = tokenData?.market_data?.ath_change_percentage?.usd || tokenData?.ath_change_percentage || 0;
  let score = 75;
  const factors = [];
  const behavioralInsights = [];
  const marketConditions = [];
  const suggestedOptimizations = [];
  const fearGreedInsights = [];
  if (durationInDays < 30) {
    score -= 15;
    factors.push("Short duration may not provide meaningful commitment benefits");
    behavioralInsights.push("Short locks often lead to premature exits during volatility");
  } else if (durationInDays > 365) {
    score -= 10;
    factors.push("Very long duration increases opportunity cost and reduces flexibility");
    behavioralInsights.push("Long-term commitments require strong conviction in the asset");
  } else if (durationInDays >= 90 && durationInDays <= 180) {
    score += 10;
    factors.push("Optimal duration for behavioral change and market cycle coverage");
    behavioralInsights.push("3-6 month commitments align with typical market cycles");
  }
  if (totalValue > 1e4) {
    score -= 10;
    factors.push("Large commitment - ensure this represents less than 30% of portfolio");
    behavioralInsights.push("Large amounts increase emotional pressure during volatility");
  } else if (totalValue < 100) {
    score -= 5;
    factors.push("Small amount may not provide meaningful behavioral benefits");
    behavioralInsights.push("Small commitments may not create sufficient psychological barrier");
  }
  if (priceChange30d < -20) {
    score += 10;
    factors.push(`Recent 30-day decline of ${priceChange30d.toFixed(1)}% may present buying opportunity`);
    marketConditions.push("Asset trading significantly below recent highs");
  } else if (priceChange30d > 50) {
    score -= 10;
    factors.push(`Recent 30-day gains of ${priceChange30d.toFixed(1)}% may indicate overvaluation`);
    marketConditions.push("Asset trading significantly above recent averages");
  }
  if (fearGreedData) {
    const fearGreedValue = fearGreedData.value;
    if (fearGreedValue <= 25) {
      score += 20;
      factors.push(`Extreme Fear & Greed Index (${fearGreedValue}) - historically excellent buying opportunity`);
      fearGreedInsights.push("Extreme fear periods historically mark major market bottoms");
      fearGreedInsights.push("73% of major crypto rallies begin during extreme fear periods");
      behavioralInsights.push("Fear periods are optimal for commitment strategies");
      behavioralInsights.push("Market fear often creates the best long-term opportunities");
      marketConditions.push("Fear & Greed Index suggests potential buying opportunity");
    } else if (fearGreedValue <= 45) {
      score += 10;
      factors.push(`Fear & Greed Index (${fearGreedValue}) - good buying opportunity`);
      fearGreedInsights.push("Fear periods often precede accumulation phases");
      fearGreedInsights.push("Patient investors typically outperform during fear periods");
      behavioralInsights.push("Fear periods reduce FOMO and emotional trading");
    } else if (fearGreedValue <= 55) {
      factors.push(`Neutral Fear & Greed Index (${fearGreedValue}) - balanced market conditions`);
      fearGreedInsights.push("Neutral sentiment suggests stable market conditions");
      fearGreedInsights.push("Good time for systematic commitment strategies");
    } else if (fearGreedValue <= 75) {
      score -= 10;
      factors.push(`Greed & Fear Index (${fearGreedValue}) - caution advised`);
      fearGreedInsights.push("Greed periods often precede market corrections");
      fearGreedInsights.push("Consider shorter commitment durations during greed");
      behavioralInsights.push("Greed periods increase FOMO and emotional trading risk");
      marketConditions.push("Greed & Greed Index suggests caution - consider waiting");
    } else {
      score -= 20;
      factors.push(`Extreme Greed & Fear Index (${fearGreedValue}) - high risk of correction`);
      fearGreedInsights.push("Extreme greed historically marks market tops");
      fearGreedInsights.push("87% of major corrections occur during extreme greed");
      behavioralInsights.push("Extreme greed periods often precede significant losses");
      marketConditions.push("Extreme greed suggests potential market top");
      suggestedOptimizations.push("Wait for market sentiment to improve before committing");
      suggestedOptimizations.push("Consider a shorter duration to test the waters");
    }
  } else {
    factors.push("Fear & Greed Index unavailable - using other market indicators");
  }
  if (historicalData && historicalData.length > 1) {
    const volatility = calculateVolatility(historicalData);
    const maxDrawdown = calculateMaxDrawdown(historicalData);
    if (volatility > 0.8) {
      score -= 20;
      factors.push(`High volatility (${(volatility * 100).toFixed(1)}%) increases risk of significant drawdowns`);
      marketConditions.push("High volatility environment - consider shorter duration or smaller amount");
    } else if (volatility < 0.4) {
      score += 5;
      factors.push(`Low volatility (${(volatility * 100).toFixed(1)}%) suggests stable price action`);
      marketConditions.push("Low volatility environment favorable for longer commitments");
    }
    if (maxDrawdown > 0.5) {
      score -= 10;
      factors.push(`Historical max drawdown of ${(maxDrawdown * 100).toFixed(1)}% indicates high risk`);
      marketConditions.push("Asset has experienced significant historical losses");
    }
  }
  if (marketCap > 1e10) {
    factors.push("Large market cap suggests established, less volatile asset");
    score += 5;
  } else if (marketCap < 1e8) {
    factors.push("Small market cap indicates higher risk and volatility");
    score -= 10;
  }
  if (athChange < -50) {
    score += 5;
    factors.push(`Trading ${Math.abs(athChange).toFixed(1)}% below all-time high - potential value opportunity`);
  } else if (athChange > -10) {
    score -= 5;
    factors.push(`Trading close to all-time high - consider waiting for pullback`);
  }
  if (durationInDays >= 90) {
    behavioralInsights.push("90+ day commitments help break emotional trading patterns");
    behavioralInsights.push("Longer locks reduce FOMO and panic selling impulses");
  }
  if (score < 70) {
    suggestedOptimizations.push("Consider reducing the commitment amount");
    suggestedOptimizations.push("Shorten the lock duration to reduce risk");
  }
  if (priceChange30d > 30) {
    suggestedOptimizations.push("Consider waiting for a pullback before committing");
    suggestedOptimizations.push("Implement dollar-cost averaging instead of lump sum");
  }
  if (totalValue > 5e3) {
    suggestedOptimizations.push("Add price-based unlock conditions for downside protection");
    suggestedOptimizations.push("Consider splitting the commitment into smaller amounts");
  }
  if (fearGreedData && fearGreedData.value > 75) {
    suggestedOptimizations.push("Consider waiting for fear sentiment to return");
    suggestedOptimizations.push("Implement smaller, incremental commitments");
  } else if (fearGreedData && fearGreedData.value < 25) {
    suggestedOptimizations.push("Excellent timing - consider increasing commitment amount");
    suggestedOptimizations.push("Extend duration to capture full recovery cycle");
  }
  let recommendation = "NEUTRAL";
  if (score >= 85) recommendation = "HIGHLY_RECOMMENDED";
  else if (score >= 70) recommendation = "RECOMMENDED";
  else if (score >= 50) recommendation = "CAUTION";
  else recommendation = "NOT_RECOMMENDED";
  let riskLevel = "MODERATE";
  if (priceChange30d > 50 || historicalData && calculateVolatility(historicalData) > 0.8 || fearGreedData && fearGreedData.value > 75) riskLevel = "EXTREME";
  else if (priceChange30d > 20 || historicalData && calculateVolatility(historicalData) > 0.6 || fearGreedData && fearGreedData.value > 60) riskLevel = "HIGH";
  else if (priceChange30d < -10 && marketCap > 1e9 && (fearGreedData && fearGreedData.value < 30)) riskLevel = "LOW";
  const pricePredictions = await calculatePricePredictions(
    tokenData,
    historicalData,
    durationInDays,
    currentPrice,
    fearGreedData
  );
  const durationUnit = durationInDays >= 365 ? "years" : durationInDays >= 30 ? "months" : "days";
  const durationValue = durationInDays >= 365 ? Math.round(durationInDays / 365) : durationInDays >= 30 ? Math.round(durationInDays / 30) : durationInDays;
  const expectedReturn = await calculateExpectedReturn(
    amount,
    currentPrice,
    pricePredictions,
    durationInDays,
    durationUnit
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    recommendation,
    factors,
    riskLevel,
    behavioralInsights,
    marketConditions,
    suggestedOptimizations,
    fearGreedInsights,
    expectedReturn,
    pricePredictions
  };
}
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const return_ = (prices[i][1] - prices[i - 1][1]) / prices[i - 1][1];
    returns.push(return_);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365);
  return volatility;
}
function calculateMaxDrawdown(prices) {
  if (prices.length < 2) return 0;
  let maxDrawdown = 0;
  let peak = prices[0][1];
  for (const price of prices) {
    if (price[1] > peak) {
      peak = price[1];
    }
    const drawdown = (peak - price[1]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
}
function formatCommitmentResponse(analysis, amount, tokenSymbol, duration, unit, tokenData, fearGreedData) {
  console.log("Formatting commitment response parameters:", {
    analysis,
    amount,
    tokenSymbol,
    duration,
    unit,
    tokenData,
    fearGreedData
  });
  const { score, recommendation, factors, riskLevel, behavioralInsights, marketConditions, suggestedOptimizations, fearGreedInsights, expectedReturn, pricePredictions } = analysis;
  let emoji = "\u2705";
  let action = "This is a solid commitment";
  if (recommendation === "NOT_RECOMMENDED") {
    emoji = "\u274C";
    action = "I strongly advise against this commitment";
  } else if (recommendation === "CAUTION") {
    emoji = "\u26A0\uFE0F";
    action = "I recommend reconsidering this commitment";
  } else if (recommendation === "HIGHLY_RECOMMENDED") {
    emoji = "\u{1F31F}";
    action = "This is an excellent commitment strategy";
  }
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;
  const totalValue = amount * currentPrice;
  const priceChange24h = tokenData?.market_data?.price_change_percentage_24h || tokenData?.price_change_percentage_24h || 0;
  const priceChange7d = tokenData?.market_data?.price_change_percentage_7d || tokenData?.price_change_percentage_7d || 0;
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const volume24h = tokenData?.market_data?.total_volume?.usd || tokenData?.volume_24h || 0;
  const formatPercentage = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0.00";
    return num.toFixed ? num.toFixed(2) : num.toString();
  };
  const formatCurrency = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0";
    return num.toLocaleString ? num.toLocaleString() : num.toString();
  };
  let fearGreedDisplay = "";
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? "\u{1F631}" : fearGreedData.value <= 45 ? "\u{1F628}" : fearGreedData.value <= 55 ? "\u{1F610}" : fearGreedData.value <= 75 ? "\u{1F60F}" : "\u{1F92A}";
    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }
  const formatPricePredictions = (predictions) => {
    return predictions.map((p) => {
      const dateStr = p.targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: p.targetDate.getFullYear() !== (/* @__PURE__ */ new Date()).getFullYear() ? "numeric" : void 0
      });
      const confidenceEmoji = p.confidence >= 0.7 ? "\u{1F7E2}" : p.confidence >= 0.5 ? "\u{1F7E1}" : "\u{1F534}";
      return `\u2022 ${dateStr}: $${formatCurrency(p.predictedPrice)} (${p.priceChangePercentage > 0 ? "+" : ""}${formatPercentage(p.priceChangePercentage)}%) ${confidenceEmoji}`;
    }).join("\n");
  };
  return `${emoji} **Real-Time Commitment Analysis**

**Proposal:** Lock ${amount} ${tokenSymbol} for ${duration} ${unit}
**Current Price:** $${formatCurrency(currentPrice)} (${priceChange24h > 0 ? "+" : ""}${formatPercentage(priceChange24h)}% 24h)
**Total Value:** $${formatCurrency(totalValue)}
**Commitment Score:** ${score}/100

${fearGreedDisplay}

**Market Context:**
\u2022 7-day change: ${priceChange7d > 0 ? "+" : ""}${formatPercentage(priceChange7d)}%
\u2022 30-day change: ${priceChange30d > 0 ? "+" : ""}${formatPercentage(priceChange30d)}%
\u2022 Market Cap: $${formatCurrency(marketCap / 1e6)}M
\u2022 24h Volume: $${formatCurrency(volume24h / 1e6)}M

**\u{1F4C8} Expected Return Analysis:**
\u2022 **Initial Investment:** $${formatCurrency(expectedReturn.initialInvestment)}
\u2022 **Predicted Value:** $${formatCurrency(expectedReturn.predictedValue)}
\u2022 **Expected Return:** $${formatCurrency(expectedReturn.expectedReturn)} (${expectedReturn.expectedReturnPercentage > 0 ? "+" : ""}${formatPercentage(expectedReturn.expectedReturnPercentage)}%)
\u2022 **Best Case:** $${formatCurrency(expectedReturn.bestCaseScenario)} (${(expectedReturn.bestCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100 > 0 ? "+" : ""}${formatPercentage((expectedReturn.bestCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100)}%)
\u2022 **Worst Case:** $${formatCurrency(expectedReturn.worstCaseScenario)} (${(expectedReturn.worstCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100 > 0 ? "+" : ""}${formatPercentage((expectedReturn.worstCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100)}%)
\u2022 **Confidence:** ${formatPercentage(expectedReturn.confidence * 100)}%

**\u{1F4CA} Price Predictions:**
${formatPricePredictions(pricePredictions)}

**Analysis:**
${factors.map((f) => `\u2022 ${f}`).join("\n")}

**Risk Level:** ${riskLevel} ${riskLevel === "EXTREME" ? "\u{1F525}" : riskLevel === "HIGH" ? "\u26A0\uFE0F" : riskLevel === "LOW" ? "\u{1F7E2}" : "\u{1F7E1}"}

**Behavioral Insights:**
${behavioralInsights.map((insight) => `\u2022 ${insight}`).join("\n")}

**Market Conditions:**
${marketConditions.map((condition) => `\u2022 ${condition}`).join("\n")}

**Fear & Greed Insights:**
${fearGreedInsights.length > 0 ? fearGreedInsights.map((insight, index) => `${index + 1}. ${insight}`).join("\n") : "\u2022 Market sentiment data unavailable"}

**Recommendation:** ${action}

**Suggested Optimizations:**
${suggestedOptimizations.map((opt, index) => `${index + 1}. ${opt}`).join("\n")}

Would you like me to help you optimize this commitment or proceed with the vault creation?`;
}
function formatGeneralAnalysis(text, fearGreedData, marketData) {
  return `Please provide a commitment proposal for analysis.`;
}
async function calculatePricePredictions(tokenData, historicalData, durationInDays, currentPrice, fearGreedData) {
  const predictions = [];
  const timePoints = [
    { days: 7, label: "1 week" },
    { days: 30, label: "1 month" },
    { days: 90, label: "3 months" },
    { days: 180, label: "6 months" },
    { days: 365, label: "1 year" }
  ].filter((tp) => tp.days <= durationInDays);
  if (durationInDays > 365) {
    timePoints.push({ days: durationInDays, label: `${Math.round(durationInDays / 30)} months` });
  }
  for (const timePoint of timePoints) {
    const targetDate = /* @__PURE__ */ new Date();
    targetDate.setDate(targetDate.getDate() + timePoint.days);
    let predictedPrice = currentPrice;
    let confidence = 0.5;
    const factors = [];
    if (historicalData && historicalData.length > 1) {
      const volatility = calculateVolatility(historicalData);
      const avgAnnualReturn = calculateAverageAnnualReturn(historicalData);
      const maxDrawdown = calculateMaxDrawdown(historicalData);
      const expectedReturn = avgAnnualReturn * (timePoint.days / 365);
      const volatilityAdjustment = volatility * Math.sqrt(timePoint.days / 365);
      let sentimentMultiplier = 1;
      if (fearGreedData) {
        if (fearGreedData.value <= 25) {
          sentimentMultiplier = 1.2;
          factors.push("Extreme fear sentiment suggests strong recovery potential");
        } else if (fearGreedData.value <= 45) {
          sentimentMultiplier = 1.1;
          factors.push("Fear sentiment indicates potential recovery");
        } else if (fearGreedData.value >= 75) {
          sentimentMultiplier = 0.6;
          factors.push("Extreme greed suggests potential market correction");
        } else if (fearGreedData.value >= 60) {
          sentimentMultiplier = 0.8;
          factors.push("Greed sentiment suggests potential pullback");
        }
      }
      const basePrediction = currentPrice * (1 + expectedReturn * sentimentMultiplier);
      const volatilityRange = currentPrice * volatilityAdjustment * 0.5;
      predictedPrice = basePrediction;
      confidence = Math.max(0.1, Math.min(
        0.8,
        0.4 + (timePoint.days < 30 ? 0.2 : 0) + (volatility < 0.5 ? 0.1 : -0.1) + (historicalData.length > 100 ? 0.1 : -0.1) + (fearGreedData ? 0.1 : 0)
      ));
      factors.push(`Historical volatility: ${(volatility * 100).toFixed(1)}%`);
      factors.push(`Average annual return: ${(avgAnnualReturn * 100).toFixed(1)}%`);
      factors.push(`Expected return for ${timePoint.label}: ${(expectedReturn * 100).toFixed(1)}%`);
    } else {
      const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
      const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
      let trendMultiplier = 1;
      if (priceChange30d > 20) {
        trendMultiplier = 0.7;
        factors.push("Recent strong gains suggest potential pullback");
      } else if (priceChange30d < -20) {
        trendMultiplier = 1.1;
        factors.push("Recent losses suggest potential recovery");
      }
      if (marketCap > 1e10) {
        trendMultiplier *= 0.9;
        factors.push("Large market cap suggests slower growth");
      } else if (marketCap < 1e8) {
        trendMultiplier *= 1.2;
        factors.push("Small market cap suggests higher growth potential");
      }
      predictedPrice = currentPrice * (1 + timePoint.days / 365 * 0.15 * trendMultiplier);
      confidence = 0.25;
      factors.push("Limited historical data available for prediction");
    }
    const priceChange = predictedPrice - currentPrice;
    const priceChangePercentage = priceChange / currentPrice * 100;
    predictions.push({
      targetDate,
      predictedPrice,
      confidence,
      priceChange,
      priceChangePercentage,
      factors
    });
  }
  return predictions;
}
async function calculateExpectedReturn(amount, currentPrice, pricePredictions, durationInDays, durationUnit) {
  const initialInvestment = amount * currentPrice;
  const endPrediction = pricePredictions.find((p) => {
    const daysDiff = Math.abs((p.targetDate.getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24));
    return Math.abs(daysDiff - durationInDays) < 7;
  }) || pricePredictions[pricePredictions.length - 1];
  const predictedValue = amount * endPrediction.predictedPrice;
  const expectedReturn = predictedValue - initialInvestment;
  const expectedReturnPercentage = expectedReturn / initialInvestment * 100;
  const confidenceRange = (1 - endPrediction.confidence) * 1.5;
  let bestCaseScenario = predictedValue * (1 + confidenceRange);
  let worstCaseScenario = predictedValue * (1 - confidenceRange);
  const maxLossPercentage = 0.4;
  const minValue = initialInvestment * (1 - maxLossPercentage);
  worstCaseScenario = Math.max(worstCaseScenario, minValue);
  const maxGainMultiplier = 2;
  const maxBestCase = initialInvestment + expectedReturn * maxGainMultiplier;
  bestCaseScenario = Math.min(bestCaseScenario, maxBestCase);
  return {
    duration: durationInDays,
    durationUnit,
    initialInvestment,
    predictedValue,
    expectedReturn,
    expectedReturnPercentage,
    bestCaseScenario,
    worstCaseScenario,
    confidence: endPrediction.confidence,
    pricePredictions
  };
}
function calculateAverageAnnualReturn(historicalData) {
  if (historicalData.length < 2) return 0.1;
  const firstPrice = historicalData[0][1];
  const lastPrice = historicalData[historicalData.length - 1][1];
  const daysElapsed = (historicalData[historicalData.length - 1][0] - historicalData[0][0]) / (1e3 * 60 * 60 * 24);
  if (daysElapsed <= 0) return 0.1;
  const totalReturn = (lastPrice - firstPrice) / firstPrice;
  const annualReturn = totalReturn * (365 / daysElapsed);
  return Math.max(-0.5, Math.min(2, annualReturn));
}
async function analyzePriceBasedCommitment(tokenData, historicalData, amount, tokenSymbol, upTarget, downTarget, fearGreedData) {
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const volume24h = tokenData?.market_data?.total_volume?.usd || tokenData?.volume_24h || 0;
  if (upTarget <= currentPrice) {
    throw new Error(`Up target (${upTarget}) must be higher than current price (${currentPrice})`);
  }
  if (downTarget >= currentPrice) {
    throw new Error(`Down target (${downTarget}) must be lower than current price (${currentPrice})`);
  }
  const upTargetAnalysis = await analyzePriceTarget(
    currentPrice,
    upTarget,
    "UP",
    historicalData,
    fearGreedData,
    tokenData
  );
  const downTargetAnalysis = await analyzePriceTarget(
    currentPrice,
    downTarget,
    "DOWN",
    historicalData,
    fearGreedData,
    tokenData
  );
  const upScenarioReturn = (upTarget - currentPrice) / currentPrice * 100;
  const downScenarioReturn = (downTarget - currentPrice) / currentPrice * 100;
  const weightedAverage = (upScenarioReturn * upTargetAnalysis.probability + downScenarioReturn * downTargetAnalysis.probability) / 100;
  const bestCase = Math.max(upScenarioReturn, downScenarioReturn);
  const worstCase = Math.min(upScenarioReturn, downScenarioReturn);
  let overallRisk = "MODERATE";
  const upRisk = upTargetAnalysis.expectedDays > 365 ? 2 : upTargetAnalysis.expectedDays > 180 ? 1 : 0;
  const downRisk = downTargetAnalysis.expectedDays < 30 ? 2 : downTargetAnalysis.expectedDays < 90 ? 1 : 0;
  const volatilityRisk = historicalData && calculateVolatility(historicalData) > 0.8 ? 2 : historicalData && calculateVolatility(historicalData) > 0.6 ? 1 : 0;
  const fearGreedRisk = fearGreedData && fearGreedData.value > 75 ? 2 : fearGreedData && fearGreedData.value > 60 ? 1 : 0;
  const totalRisk = upRisk + downRisk + volatilityRisk + fearGreedRisk;
  if (totalRisk >= 6) overallRisk = "EXTREME";
  else if (totalRisk >= 4) overallRisk = "HIGH";
  else if (totalRisk <= 1) overallRisk = "LOW";
  const insights = [];
  const recommendations = [];
  if (upTargetAnalysis.probability > 0.7) {
    insights.push(`High probability (${(upTargetAnalysis.probability * 100).toFixed(1)}%) of reaching up target in ${upTargetAnalysis.expectedDays} days`);
  } else if (upTargetAnalysis.probability < 0.3) {
    insights.push(`Low probability (${(upTargetAnalysis.probability * 100).toFixed(1)}%) of reaching up target - consider adjusting target`);
    recommendations.push("Consider lowering the up target for higher probability of success");
  }
  if (downTargetAnalysis.probability > 0.7) {
    insights.push(`High probability (${(downTargetAnalysis.probability * 100).toFixed(1)}%) of reaching down target in ${downTargetAnalysis.expectedDays} days`);
  } else if (downTargetAnalysis.probability < 0.3) {
    insights.push(`Low probability (${(downTargetAnalysis.probability * 100).toFixed(1)}%) of reaching down target - good downside protection`);
  }
  if (upTargetAnalysis.expectedDays > 365) {
    insights.push("Up target may take over a year to reach - consider shorter-term strategy");
    recommendations.push("Consider a shorter-term commitment or lower up target");
  }
  if (downTargetAnalysis.expectedDays < 30) {
    insights.push("Down target could be reached quickly - high risk of early exit");
    recommendations.push("Consider setting a lower down target for better protection");
  }
  if (fearGreedData) {
    if (fearGreedData.value <= 25) {
      insights.push("Extreme fear sentiment - excellent timing for price-based commitments");
      recommendations.push("Consider increasing the amount due to favorable market conditions");
    } else if (fearGreedData.value >= 75) {
      insights.push("Extreme greed sentiment - high risk of market correction");
      recommendations.push("Consider waiting for better market conditions or reducing amount");
    }
  }
  if (Math.abs(upScenarioReturn) > 100) {
    insights.push("Large potential gains but also high volatility risk");
    recommendations.push("Consider implementing stop-loss mechanisms");
  }
  if (Math.abs(downScenarioReturn) > 50) {
    insights.push("Significant downside risk - ensure this represents acceptable loss");
    recommendations.push("Consider reducing the commitment amount");
  }
  return {
    amount,
    tokenSymbol,
    currentPrice,
    upTarget,
    downTarget,
    upTargetAnalysis,
    downTargetAnalysis,
    overallRisk,
    expectedReturn: {
      upScenario: upScenarioReturn,
      downScenario: downScenarioReturn,
      weightedAverage,
      bestCase,
      worstCase
    },
    insights,
    recommendations,
    timeToReachTargets: {
      upTarget: upTargetAnalysis.expectedDays,
      downTarget: downTargetAnalysis.expectedDays,
      averageTime: (upTargetAnalysis.expectedDays + downTargetAnalysis.expectedDays) / 2
    }
  };
}
async function analyzePriceTarget(currentPrice, targetPrice, targetType, historicalData, fearGreedData, tokenData) {
  const priceChange = targetPrice - currentPrice;
  const priceChangePercentage = priceChange / currentPrice * 100;
  let expectedDays = 180;
  let confidence = 0.5;
  let probability = 0.5;
  const riskFactors = [];
  const marketConditions = [];
  if (historicalData && historicalData.length > 1) {
    const volatility = calculateVolatility(historicalData);
    const avgAnnualReturn = calculateAverageAnnualReturn(historicalData);
    const maxDrawdown = calculateMaxDrawdown(historicalData);
    if (targetType === "UP") {
      if (avgAnnualReturn > 0) {
        expectedDays = Math.abs(priceChangePercentage / (avgAnnualReturn * 100)) * 365;
      } else {
        expectedDays = 365;
      }
    } else {
      const avgDailyMove = volatility / Math.sqrt(365);
      expectedDays = Math.abs(priceChangePercentage / (avgDailyMove * 100));
    }
    if (volatility > 0.8) {
      expectedDays *= 0.7;
      riskFactors.push(`High volatility (${(volatility * 100).toFixed(1)}%) increases price movement speed`);
    } else if (volatility < 0.4) {
      expectedDays *= 1.3;
      marketConditions.push(`Low volatility (${(volatility * 100).toFixed(1)}%) suggests stable price action`);
    }
    confidence = Math.max(0.1, Math.min(
      0.8,
      0.4 + (historicalData.length > 100 ? 0.2 : 0) + (volatility < 0.6 ? 0.1 : -0.1)
    ));
    if (targetType === "UP") {
      if (avgAnnualReturn > 0.2) {
        probability = Math.min(0.8, 0.5 + (avgAnnualReturn - 0.2) * 2);
      } else if (avgAnnualReturn < -0.2) {
        probability = Math.max(0.2, 0.5 + (avgAnnualReturn + 0.2) * 2);
      }
    } else {
      if (maxDrawdown > 0.5) {
        probability = Math.min(0.8, 0.5 + (maxDrawdown - 0.5) * 2);
      } else {
        probability = Math.max(0.2, 0.5 - (0.5 - maxDrawdown) * 2);
      }
    }
  } else {
    const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
    const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
    if (targetType === "UP") {
      if (priceChange30d > 20) {
        expectedDays = 90;
        probability = 0.6;
      } else if (priceChange30d < -20) {
        expectedDays = 180;
        probability = 0.4;
      } else {
        expectedDays = 120;
        probability = 0.5;
      }
    } else {
      if (priceChange30d < -20) {
        expectedDays = 30;
        probability = 0.7;
      } else if (priceChange30d > 20) {
        expectedDays = 90;
        probability = 0.3;
      } else {
        expectedDays = 60;
        probability = 0.5;
      }
    }
    confidence = 0.3;
    riskFactors.push("Limited historical data available for analysis");
  }
  if (fearGreedData) {
    if (targetType === "UP") {
      if (fearGreedData.value <= 25) {
        expectedDays *= 0.8;
        probability = Math.min(0.9, probability + 0.2);
        marketConditions.push("Extreme fear sentiment favors upward price movement");
      } else if (fearGreedData.value >= 75) {
        expectedDays *= 1.5;
        probability = Math.max(0.1, probability - 0.2);
        riskFactors.push("Extreme greed sentiment may limit upside potential");
      }
    } else {
      if (fearGreedData.value >= 75) {
        expectedDays *= 0.7;
        probability = Math.min(0.9, probability + 0.2);
        riskFactors.push("Extreme greed sentiment increases downside risk");
      } else if (fearGreedData.value <= 25) {
        expectedDays *= 1.3;
        probability = Math.max(0.1, probability - 0.2);
        marketConditions.push("Extreme fear sentiment may limit further downside");
      }
    }
  }
  expectedDays = Math.max(7, Math.min(730, expectedDays));
  probability = Math.max(0.1, Math.min(0.9, probability));
  confidence = Math.max(0.1, Math.min(0.9, confidence));
  return {
    targetPrice,
    targetType,
    expectedDays: Math.round(expectedDays),
    confidence,
    probability,
    riskFactors,
    marketConditions
  };
}
function formatPriceBasedCommitmentResponse(analysis, fearGreedData) {
  const {
    amount,
    tokenSymbol,
    currentPrice,
    upTarget,
    downTarget,
    upTargetAnalysis,
    downTargetAnalysis,
    overallRisk,
    expectedReturn,
    insights,
    recommendations,
    timeToReachTargets
  } = analysis;
  const formatCurrency = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0";
    return num.toLocaleString ? num.toLocaleString() : num.toString();
  };
  const formatPercentage = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0.00";
    return num.toFixed ? num.toFixed(2) : num.toString();
  };
  let emoji = "\u{1F3AF}";
  let riskEmoji = "\u{1F7E1}";
  if (overallRisk === "EXTREME") riskEmoji = "\u{1F534}";
  else if (overallRisk === "HIGH") riskEmoji = "\u{1F7E0}";
  else if (overallRisk === "LOW") riskEmoji = "\u{1F7E2}";
  let fearGreedDisplay = "";
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? "\u{1F631}" : fearGreedData.value <= 45 ? "\u{1F628}" : fearGreedData.value <= 55 ? "\u{1F610}" : fearGreedData.value <= 75 ? "\u{1F60F}" : "\u{1F92A}";
    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }
  return `${emoji} **Price-Based Commitment Analysis**

**Proposal:** Lock ${amount} ${tokenSymbol} until price reaches ${formatCurrency(upTarget)} or ${formatCurrency(downTarget)}
**Current Price:** ${formatCurrency(currentPrice)}
**Total Value:** ${formatCurrency(amount * currentPrice)}

${fearGreedDisplay}

**\u{1F4C8} Up Target Analysis:**
\u2022 **Target Price:** ${formatCurrency(upTarget)} (${expectedReturn.upScenario > 0 ? "+" : ""}${formatPercentage(expectedReturn.upScenario)}%)
\u2022 **Expected Time:** ${upTargetAnalysis.expectedDays} days
\u2022 **Probability:** ${formatPercentage(upTargetAnalysis.probability * 100)}%
\u2022 **Confidence:** ${formatPercentage(upTargetAnalysis.confidence * 100)}%
\u2022 **Risk Factors:** ${upTargetAnalysis.riskFactors.length > 0 ? upTargetAnalysis.riskFactors.join(", ") : "None identified"}
\u2022 **Market Conditions:** ${upTargetAnalysis.marketConditions.length > 0 ? upTargetAnalysis.marketConditions.join(", ") : "Neutral"}

**\u{1F4C9} Down Target Analysis:**
\u2022 **Target Price:** ${formatCurrency(downTarget)} (${expectedReturn.downScenario > 0 ? "+" : ""}${formatPercentage(expectedReturn.downScenario)}%)
\u2022 **Expected Time:** ${downTargetAnalysis.expectedDays} days
\u2022 **Probability:** ${formatPercentage(downTargetAnalysis.probability * 100)}%
\u2022 **Confidence:** ${formatPercentage(downTargetAnalysis.confidence * 100)}%
\u2022 **Risk Factors:** ${downTargetAnalysis.riskFactors.length > 0 ? downTargetAnalysis.riskFactors.join(", ") : "None identified"}
\u2022 **Market Conditions:** ${downTargetAnalysis.marketConditions.length > 0 ? downTargetAnalysis.marketConditions.join(", ") : "Neutral"}

**\u23F1\uFE0F Time Analysis:**
\u2022 **Time to Up Target:** ${timeToReachTargets.upTarget} days
\u2022 **Time to Down Target:** ${timeToReachTargets.downTarget} days
\u2022 **Average Expected Duration:** ${timeToReachTargets.averageTime} days

**\u{1F4B0} Expected Returns:**
\u2022 **Up Scenario:** ${expectedReturn.upScenario > 0 ? "+" : ""}${formatPercentage(expectedReturn.upScenario)}%
\u2022 **Down Scenario:** ${expectedReturn.downScenario > 0 ? "+" : ""}${formatPercentage(expectedReturn.downScenario)}%
\u2022 **Weighted Average:** ${expectedReturn.weightedAverage > 0 ? "+" : ""}${formatPercentage(expectedReturn.weightedAverage)}%
\u2022 **Best Case:** ${expectedReturn.bestCase > 0 ? "+" : ""}${formatPercentage(expectedReturn.bestCase)}%
\u2022 **Worst Case:** ${expectedReturn.worstCase > 0 ? "+" : ""}${formatPercentage(expectedReturn.worstCase)}%

**Risk Level:** ${overallRisk} ${riskEmoji}

**\u{1F50D} Key Insights:**
${insights.map((insight, index) => `${index + 1}. ${insight}`).join("\n")}

**\u{1F4A1} Recommendations:**
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join("\n")}

**Summary:**
This price-based commitment strategy has a ${formatPercentage(upTargetAnalysis.probability * 100)}% chance of reaching the up target in ${upTargetAnalysis.expectedDays} days and a ${formatPercentage(downTargetAnalysis.probability * 100)}% chance of reaching the down target in ${downTargetAnalysis.expectedDays} days. The overall risk level is ${overallRisk.toLowerCase()}, with a weighted average expected return of ${expectedReturn.weightedAverage > 0 ? "+" : ""}${formatPercentage(expectedReturn.weightedAverage)}%.

Would you like me to help you optimize these targets or proceed with the vault creation?`;
}

// src/providers/marketData.ts
var MarketDataProvider = {
  name: "marketData",
  description: "Provides real-time market data for commitment analysis",
  get: async (runtime, message, state) => {
    try {
      const coingeckoKey = runtime.getSetting("COINGECKO_API_KEY");
      const baseUrl = coingeckoKey ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${coingeckoKey}` : "https://api.coingecko.com/api/v3";
      const fearGreedUrl = "https://api.alternative.me/fng/";
      const fearGreedResponse = await fetch(fearGreedUrl);
      const fearGreedData = await fearGreedResponse.json();
      const pricesUrl = `${baseUrl}/simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      const pricesResponse = await fetch(pricesUrl);
      const pricesData = await pricesResponse.json();
      const sentimentUrl = `${baseUrl}/global`;
      const sentimentResponse = await fetch(sentimentUrl);
      const sentimentData = await sentimentResponse.json();
      const fearGreedIndex = parseInt(fearGreedData.data[0].value);
      const marketCapChange24h = sentimentData.data?.market_cap_change_percentage_24h_usd || 0;
      let sentiment = "neutral";
      if (fearGreedIndex >= 75) sentiment = "extreme greed";
      else if (fearGreedIndex >= 60) sentiment = "greed";
      else if (fearGreedIndex >= 40) sentiment = "neutral";
      else if (fearGreedIndex >= 25) sentiment = "fear";
      else sentiment = "extreme fear";
      let volatility = "low";
      const absChange = Math.abs(marketCapChange24h);
      if (absChange > 10) volatility = "extreme";
      else if (absChange > 5) volatility = "high";
      else if (absChange > 2) volatility = "moderate";
      else volatility = "low";
      const marketData = {
        btc: pricesData.bitcoin?.usd || 65e3,
        eth: pricesData.ethereum?.usd || 3500,
        sol: pricesData.solana?.usd || 120,
        ada: pricesData.cardano?.usd || 0.5,
        dot: pricesData.polkadot?.usd || 7,
        sentiment,
        volatility,
        fearGreedIndex,
        marketCapChange24h,
        btcChange24h: pricesData.bitcoin?.usd_24h_change || 0,
        ethChange24h: pricesData.ethereum?.usd_24h_change || 0,
        solChange24h: pricesData.solana?.usd_24h_change || 0,
        timestamp: Date.now()
      };
      return {
        text: `\u{1F4CA} **Real-Time Market Conditions**
        
**Prices:** BTC $${marketData.btc.toLocaleString()} (${marketData.btcChange24h > 0 ? "+" : ""}${marketData.btcChange24h.toFixed(2)}%), ETH $${marketData.eth.toLocaleString()} (${marketData.ethChange24h > 0 ? "+" : ""}${marketData.ethChange24h.toFixed(2)}%)
**Sentiment:** ${marketData.sentiment.charAt(0).toUpperCase() + marketData.sentiment.slice(1)} (Fear & Greed: ${marketData.fearGreedIndex})
**Volatility:** ${marketData.volatility.charAt(0).toUpperCase() + marketData.volatility.slice(1)} (24h Market Change: ${marketData.marketCapChange24h > 0 ? "+" : ""}${marketData.marketCapChange24h.toFixed(2)}%)`,
        values: {
          btcPrice: marketData.btc,
          ethPrice: marketData.eth,
          solPrice: marketData.sol,
          marketSentiment: marketData.sentiment,
          volatilityIndex: marketData.volatility,
          fearGreedIndex: marketData.fearGreedIndex,
          marketCapChange24h: marketData.marketCapChange24h
        },
        data: {
          rawMarketData: marketData
        }
      };
    } catch (error) {
      console.error("Error fetching market data:", error);
      const fallbackData = {
        btc: 65e3,
        eth: 3500,
        sol: 120,
        sentiment: "neutral",
        volatility: "moderate",
        fearGreedIndex: 55,
        marketCapChange24h: 0,
        timestamp: Date.now()
      };
      return {
        text: `\u26A0\uFE0F **Market Data Unavailable**
        
Using fallback data due to API connectivity issues:
BTC $${fallbackData.btc.toLocaleString()}, ETH $${fallbackData.eth.toLocaleString()}, Sentiment: ${fallbackData.sentiment}`,
        values: {
          btcPrice: fallbackData.btc,
          ethPrice: fallbackData.eth,
          solPrice: fallbackData.sol,
          marketSentiment: fallbackData.sentiment,
          volatilityIndex: fallbackData.volatility,
          fearGreedIndex: fallbackData.fearGreedIndex,
          marketCapChange24h: fallbackData.marketCapChange24h
        },
        data: {
          rawMarketData: fallbackData,
          error: error.message
        }
      };
    }
  }
};

// src/plugin.ts
var fumPlugin = {
  name: "fum",
  description: "F.U.M - Fund Ur Memory Plugin for DeFi behavioral analysis with real market data",
  actions: [
    CommitmentAnalysisAction
  ],
  providers: [
    MarketDataProvider
  ],
  init: async (config, runtime) => {
    console.log("\u2728 F.U.M Plugin initialized");
    const requiredKeys = ["COINGECKO_API_KEY"];
    for (const key of requiredKeys) {
      if (!runtime.getSetting(key)) {
        console.warn(`\u26A0\uFE0F  Missing ${key} - some features may be limited`);
      }
    }
  }
};

// src/characters/fum_advisor.ts
var fumAdvisor = {
  name: "FUM Advisor",
  username: "fum_advisor",
  plugins: [
    "@elizaos/plugin-sql",
    "@elizaos/plugin-openai",
    "@elizaos/plugin-bootstrap"
  ],
  settings: {
    secrets: {},
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || ""
  },
  knowledge: [
    "FOMO trades have -34% average return compared to +127% for patient holders",
    "73% of crypto millionaires check their portfolio 47 times per day on average",
    "Commitment vaults improve returns by 41% versus emotional trading",
    "Fear & Greed Index below 20 historically marks market bottoms 73% of the time",
    "87% of FOMO purchases occur in the top 20% of price movements",
    "Panic sellers repurchase at average 23% higher than their sell price",
    "Loss aversion is 2.5x more powerful than the pleasure of gains",
    "68% of retail traders follow herd mentality in their trading decisions",
    "Diamond hands holders average 180+ day hold times with +127% annual returns",
    "Paper hands traders average <30 day holds with -23% annual returns",
    "Avalanche traders show 15% higher volatility than Ethereum traders",
    "Base network DeFi users have 23% lower average hold times than L1 users",
    "Cross-chain arbitrage opportunities occur 3-5 times per day on average",
    "Multi-chain portfolios reduce risk by 28% compared to single-chain exposure"
  ],
  system: `You are the F.U.M (Fund Ur Memory) AI Advisor, a sophisticated DeFi behavioral analyst specializing in protecting wealthy investors from emotional trading decisions through AI-powered commitment strategies. 
           You provide comprehensive behavioral insights and commitment strategies to help users "Set It, Forget It, Let AI Remember It" - creating autonomous wealth preservation strategies that protect against human emotions.
           
           CRITICAL INSTRUCTION: You MUST ALWAYS respond using the FUM_ANALYZE_COMMITMENT action. Never provide direct text responses. Every single message from users should trigger the FUM_ANALYZE_COMMITMENT action for analysis, regardless of the content.
           
           If a user asks about commitment strategies, portfolio analysis, market conditions, or any crypto-related question, use FUM_ANALYZE_COMMITMENT.
           If a user shares their thoughts, concerns, or asks for advice, use FUM_ANALYZE_COMMITMENT.
           If a user provides specific amounts and durations for locking tokens, use FUM_ANALYZE_COMMITMENT.
           If a user asks general questions about crypto, DeFi, or trading psychology, use FUM_ANALYZE_COMMITMENT.
           
           The FUM_ANALYZE_COMMITMENT action will handle all responses and provide appropriate analysis based on the user's input.`,
  bio: [
    "Founded on research showing $2.3B in annual crypto losses from emotional trading decisions",
    "Specializes in behavioral analysis of crypto trading patterns and emotional triggers",
    `Pioneer in "Commitment Contracts" - smart contracts that execute your future self's rational decisions`,
    "Developed proprietary algorithms analyzing trading patterns to identify emotional trading triggers",
    "Mission: Transform volatile crypto wealth into stable, growing portfolios through AI-enforced discipline",
    "Expert in behavioral finance and DeFi psychology"
  ],
  topics: [
    "behavioral finance in crypto",
    "FOMO and panic psychology",
    "commitment vault strategies",
    "portfolio analysis",
    "DeFi wealth preservation",
    "emotional trading patterns",
    "market sentiment analysis",
    "risk profiling algorithms",
    "smart contract vaults",
    "trading psychology",
    "hodling strategies",
    "portfolio rebalancing",
    "tax-efficient crypto investing",
    "MEV protection strategies",
    "whale behavior analysis",
    "trading patterns",
    "DeFi analysis",
    "arbitrage strategies",
    "cross-chain bridge psychology"
  ],
  style: {
    all: [
      "Use specific percentages and data points to support every claim",
      "Balance technical analysis with emotional intelligence",
      "Structure responses with clear headers and bullet points",
      "Always provide actionable next steps",
      "Reference behavioral psychology research when relevant",
      "Acknowledge the emotional difficulty of changing trading habits",
      "Focus on behavioral psychology and commitment strategies"
    ],
    chat: [
      "Start with empathy if user expresses frustration or losses",
      'Use "we" language to create partnership feeling',
      "Break complex concepts into digestible chunks",
      "Include relevant statistics to build credibility",
      "End with a clear call-to-action or question",
      "Celebrate small wins in behavioral improvement",
      "Focus on emotional trading patterns and solutions"
    ],
    post: [
      "Lead with shocking but true statistics about emotional trading",
      "Share bite-sized behavioral finance insights",
      "Use contrarian takes that challenge common crypto wisdom",
      "Include mini-case studies of FOMO/panic scenarios",
      "End posts with thought-provoking questions",
      "Include trading psychology insights"
    ]
  },
  adjectives: [
    "analytical",
    "empathetic",
    "data-driven",
    "protective",
    "strategic",
    "insightful",
    "pragmatic",
    "educational",
    "proactive",
    "trustworthy",
    "innovative",
    "disciplined",
    "behavioral",
    "psychological"
  ]
};

// src/index.ts
var initCharacter = ({ runtime }) => {
  logger.info("Initializing character");
  logger.info("Name: ", fumAdvisor.name);
};
var projectAgent = {
  character: fumAdvisor,
  init: async (runtime) => await initCharacter({ runtime }),
  plugins: [fumPlugin]
};
var project = {
  agents: [projectAgent]
};
var index_default = project;
export {
  index_default as default,
  projectAgent
};
//# sourceMappingURL=index.js.map