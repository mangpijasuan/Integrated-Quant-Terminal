
import { GoogleGenAI, Type } from "@google/genai";
import { MarketSentiment, StockSnapshot, TimeFrame, Recommendation, OptionType } from "../types";
import { GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL } from "../constants";

const ensureArray = (arr: any) => (Array.isArray(arr) ? arr : []);


/**
 * Maps a string value to the Recommendation enum.
 * @param val - The string value to map (e.g., 'BUY', 'SELL', etc.)
 * @returns The corresponding Recommendation enum value.
 */
function toRecommendation(val: string): Recommendation {
  if (val === 'BUY') return Recommendation.Buy;
  if (val === 'SELL') return Recommendation.Sell;
  return Recommendation.Hold;
}

/**
 * Maps a string value to the OptionType enum.
 * @param val - The string value to map (e.g., 'CALL', 'PUT', etc.)
 * @returns The corresponding OptionType enum value.
 */
function toOptionType(val: string): OptionType {
  if (val === 'CALL') return OptionType.Call;
  if (val === 'PUT') return OptionType.Put;
  if (val === 'call') return OptionType.call;
  if (val === 'put') return OptionType.put;
  return OptionType.call;
}

/**
 * Parses a Gemini API response string, cleaning code block markers and extracting valid JSON.
 * Throws if parsing fails or if no valid JSON is found.
 * @param text - The Gemini response text to parse.
 * @returns The parsed JSON object or array.
 */
const parseGeminiJson = (text: string | undefined) => {
  if (!text) throw new Error("No response text to parse");
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      }
      return JSON.parse(cleaned);
    }
    return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
  } catch (e) {
    throw new Error(`Critical: Failed to parse Gemini response payload. ${e}`);
  }
};

/**
 * Fetches the current market sentiment using the Gemini Flash model.
 * Returns a MarketSentiment object with mapped enums and sources.
 * Surfaces errors to the UI if the fetch or parsing fails.
 * @returns Promise resolving to MarketSentiment
 * @throws Error if the Gemini API call or parsing fails
 */
export const fetchMarketSentiment = async (): Promise<MarketSentiment> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date().toISOString();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Timestamp: ${now}. Execute quantitative sweep of the S&P 500, Nasdaq, and Crypto markets.
      Focus on: Sector rotation (Tech vs Energy), institutional volume anomalies, and retail sentiment shifts.
      Output 4-6 specific tickers for Bullish, Bearish, and Balanced categories. Include real current prices and % changes.`,
      config: {
      systemInstruction: "You are the core logic engine for a high-frequency trading terminal. Your output MUST be strictly valid JSON. No conversational text. Do not hallucinate prices; use your grounding tools.",
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING },
          totalDollarVolume: { type: Type.NUMBER },
          callDominance: { type: Type.NUMBER },
          putDominance: { type: Type.NUMBER },
          indices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.STRING },
                change: { type: Type.STRING },
                up: { type: Type.BOOLEAN }
              }
            }
          },
          sectors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                change: { type: Type.NUMBER },
                sentiment: { type: Type.STRING }
              }
            }
          },
          bullish: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                symbol: { type: Type.STRING }, 
                currentPrice: { type: Type.NUMBER },
                priceChangePercent: { type: Type.NUMBER },
                totalVolume: { type: Type.NUMBER }, 
                dominancePercent: { type: Type.NUMBER }, 
                possibleReason: { type: Type.STRING }, 
                recommendation: { type: Type.STRING },
                topContract: { 
                  type: Type.OBJECT, 
                  properties: { 
                    type: { type: Type.STRING }, 
                    strike: { type: Type.NUMBER }, 
                    expiry: { type: Type.STRING }, 
                    dollarVolume: { type: Type.NUMBER }, 
                    midPrice: { type: Type.NUMBER } 
                  } 
                } 
              } 
            } 
          },
          bearish: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                symbol: { type: Type.STRING }, 
                currentPrice: { type: Type.NUMBER },
                priceChangePercent: { type: Type.NUMBER },
                totalVolume: { type: Type.NUMBER }, 
                dominancePercent: { type: Type.NUMBER }, 
                possibleReason: { type: Type.STRING }, 
                recommendation: { type: Type.STRING },
                topContract: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, strike: { type: Type.NUMBER }, expiry: { type: Type.STRING }, dollarVolume: { type: Type.NUMBER }, midPrice: { type: Type.NUMBER } } } 
              } 
            } 
          },
          balanced: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                symbol: { type: Type.STRING }, 
                currentPrice: { type: Type.NUMBER },
                priceChangePercent: { type: Type.NUMBER },
                totalVolume: { type: Type.NUMBER }, 
                dominancePercent: { type: Type.NUMBER }, 
                possibleReason: { type: Type.STRING }, 
                recommendation: { type: Type.STRING },
                topContract: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, strike: { type: Type.NUMBER }, expiry: { type: Type.STRING }, dollarVolume: { type: Type.NUMBER }, midPrice: { type: Type.NUMBER } } } 
              } 
            } 
          },
        }
      }
    }
    });
    const rawJson = parseGeminiJson(response.text);
    const sources = ensureArray(response.candidates?.[0]?.groundingMetadata?.groundingChunks).map((chunk: any) => ({
      title: chunk.web?.title || "Market Node",
      uri: chunk.web?.uri || "#"
    }));
    // Map recommendations and option types to enums for all symbols
    const mapSymbol = (s: any) => ({
      ...s,
      recommendation: toRecommendation(s.recommendation),
      topContract: s.topContract ? { ...s.topContract, type: toOptionType(s.topContract.type) } : undefined,
    });
    return { 
      ...rawJson, 
      bullish: ensureArray(rawJson.bullish).map(mapSymbol), 
      bearish: ensureArray(rawJson.bearish).map(mapSymbol), 
      balanced: ensureArray(rawJson.balanced).map(mapSymbol), 
      indices: ensureArray(rawJson.indices),
      sectors: ensureArray(rawJson.sectors),
      sources 
    };
  } catch (error: any) {
    // Surface error to UI
    throw new Error(error?.message || "Failed to fetch market sentiment");
  }
};

/**
 * Fetches a detailed stock snapshot for a given symbol and timeframe using the Gemini Pro model.
 * Returns a StockSnapshot object with mapped enums and sources.
 * Surfaces errors to the UI if the fetch or parsing fails.
 * @param symbol - The stock ticker symbol to fetch data for.
 * @param timeframe - The time frame for the snapshot (default: 'Daily').
 * @returns Promise resolving to StockSnapshot
 * @throws Error if the Gemini API call or parsing fails
 */
export const fetchStockSnapshot = async (symbol: string, timeframe: TimeFrame = 'Daily'): Promise<StockSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date().toISOString();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_PRO_MODEL,
      contents: `Ticker: ${symbol}. Window: ${timeframe}. Reference: ${now}.
      Objective: Execute full-spectrum technical and fundamental synthesis.
      Required: 20-30 data points for price history, RSI(14), MACD, institutional analysis.
      Crucial: Provide 'neural_scores' as integer percentages (0-100) for Momentum, Value, Growth, Sentiment, and Liquidity.`,
      config: {
      thinkingConfig: { thinkingBudget: 32768 },
      systemInstruction: "You are a tier-1 quantitative hedge fund AI. Accuracy and logical grounding are paramount. Output strictly valid JSON.",
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          companyName: { type: Type.STRING },
          currentPrice: { type: Type.NUMBER },
          priceChange: { type: Type.NUMBER },
          priceChangePercent: { type: Type.NUMBER },
          as_of_utc: { type: Type.STRING },
          candles_daily: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, open: { type: Type.NUMBER }, high: { type: Type.NUMBER }, low: { type: Type.NUMBER }, close: { type: Type.NUMBER }, volume: { type: Type.NUMBER } } } },
          indicators: { type: Type.OBJECT, properties: { rsi_14: { type: Type.NUMBER }, macd: { type: Type.OBJECT, properties: { line: { type: Type.NUMBER }, signal: { type: Type.NUMBER }, histogram: { type: Type.NUMBER } } }, atr_14: { type: Type.NUMBER }, sma: { type: Type.OBJECT, properties: { sma_20: { type: Type.NUMBER }, sma_50: { type: Type.NUMBER } } } } },
          fundamentals: { type: Type.OBJECT, properties: { pe_ratio: { type: Type.NUMBER }, market_cap: { type: Type.STRING }, dividend_yield: { type: Type.STRING }, eps: { type: Type.NUMBER }, revenue_growth: { type: Type.STRING }, net_margin: { type: Type.STRING } } },
          neural_scores: {
            type: Type.OBJECT,
            properties: {
              momentum: { type: Type.NUMBER },
              value: { type: Type.NUMBER },
              growth: { type: Type.NUMBER },
              sentiment: { type: Type.NUMBER },
              liquidity: { type: Type.NUMBER }
            }
          },
          recommendation: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, confidence: { type: Type.NUMBER }, entryRange: { type: Type.STRING }, targetPrice: { type: Type.NUMBER }, stopLoss: { type: Type.NUMBER }, horizon: { type: Type.STRING }, expectedReturn: { type: Type.STRING } } },
          risk_metrics: { type: Type.OBJECT, properties: { beta: { type: Type.NUMBER }, volatility_30d: { type: Type.NUMBER }, var_95: { type: Type.STRING }, sharpe_ratio: { type: Type.NUMBER } } },
          correlations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, correlation: { type: Type.NUMBER }, sector: { type: Type.STRING } } } },
          news_catalysts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { headline: { type: Type.STRING }, source: { type: Type.STRING }, time: { type: Type.STRING }, sentiment: { type: Type.STRING }, impact: { type: Type.STRING } } } },
          analysis: { type: Type.STRING },
          option_chain_snapshot: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { expiry: { type: Type.STRING }, type: { type: Type.STRING }, strike: { type: Type.NUMBER }, lastPrice: { type: Type.NUMBER }, iv: { type: Type.NUMBER }, delta: { type: Type.NUMBER }, theta: { type: Type.NUMBER } } } }
        }
      }
    }
    });
    const parsed = parseGeminiJson(response.text);
    const sources = ensureArray(response.candidates?.[0]?.groundingMetadata?.groundingChunks).map((chunk: any) => ({
      title: chunk.web?.title || "Research Node",
      uri: chunk.web?.uri || "#"
    }));
    // Map option_chain_snapshot types to enums if present
    const mapOption = (o: any) => ({ ...o, type: toOptionType(o.type) });
    return { 
      ...parsed, 
      candles_daily: ensureArray(parsed.candles_daily), 
      news_catalysts: ensureArray(parsed.news_catalysts), 
      correlations: ensureArray(parsed.correlations),
      option_chain_snapshot: ensureArray(parsed.option_chain_snapshot).map(mapOption),
      sources
    };
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch stock snapshot");
  }
};
