// Simple test for price prediction functionality
const mockTokenData = {
  market_data: {
    current_price: { usd: 3000 },
    price_change_percentage_30d: -15,
    market_cap: { usd: 50000000000 }
  }
};

const mockHistoricalData = [
  [Date.now() - 365 * 24 * 60 * 60 * 1000, 2500], // 1 year ago
  [Date.now() - 180 * 24 * 60 * 60 * 1000, 2800], // 6 months ago
  [Date.now() - 90 * 24 * 60 * 60 * 1000, 3200],  // 3 months ago
  [Date.now() - 30 * 24 * 60 * 60 * 1000, 3500],  // 1 month ago
  [Date.now(), 3000] // Current
];

const mockFearGreedData = {
  value: 25,
  classification: 'Extreme Fear',
  timestamp: Date.now()
};

// Test calculation functions
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const return_ = (prices[i][1] - prices[i-1][1]) / prices[i-1][1];
    returns.push(return_);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365);
  
  return volatility;
}

function calculateAverageAnnualReturn(historicalData) {
  if (historicalData.length < 2) return 0.1;
  
  const firstPrice = historicalData[0][1];
  const lastPrice = historicalData[historicalData.length - 1][1];
  const daysElapsed = (historicalData[historicalData.length - 1][0] - historicalData[0][0]) / (1000 * 60 * 60 * 24);
  
  if (daysElapsed <= 0) return 0.1;
  
  const totalReturn = (lastPrice - firstPrice) / firstPrice;
  const annualReturn = totalReturn * (365 / daysElapsed);
  
  return Math.max(-0.5, Math.min(2.0, annualReturn));
}

// Test the functions
console.log('Testing price prediction calculations...');
console.log('Current price:', mockTokenData.market_data.current_price.usd);
console.log('Historical volatility:', (calculateVolatility(mockHistoricalData) * 100).toFixed(1) + '%');
console.log('Average annual return:', (calculateAverageAnnualReturn(mockHistoricalData) * 100).toFixed(1) + '%');

// Simulate a price prediction
const currentPrice = mockTokenData.market_data.current_price.usd;
const volatility = calculateVolatility(mockHistoricalData);
const avgAnnualReturn = calculateAverageAnnualReturn(mockHistoricalData);
const sentimentMultiplier = 1.3; // Extreme fear

const daysToPredict = 90;
const expectedReturn = avgAnnualReturn * (daysToPredict / 365);
const predictedPrice = currentPrice * (1 + expectedReturn * sentimentMultiplier);

console.log(`\nPrediction for ${daysToPredict} days:`);
console.log(`Expected return: ${(expectedReturn * 100).toFixed(1)}%`);
console.log(`Predicted price: $${predictedPrice.toFixed(2)}`);
console.log(`Price change: ${(((predictedPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`);

console.log('\nTest completed successfully!'); 