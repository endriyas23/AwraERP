import { GoogleGenAI, Type } from "@google/genai";
import { Flock, AnalysisResult, Transaction, SalesOrder, Customer, MedicalRecord } from '../types';

// Initialize Gemini Client
// In a real app, ensure this is handled securely. For this demo, we assume process.env.API_KEY is available.
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeFlockPerformance = async (flock: Flock): Promise<AnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key not configured. Please check your environment variables.",
      recommendations: ["Configure API Key for AI insights."],
      alertLevel: 'LOW'
    };
  }

  // Prepare data for the prompt
  // We only send the last 7 days to keep tokens reasonable for this demo
  const recentLogs = flock.logs.slice(-7);
  const dataSummary = JSON.stringify({
    breed: flock.breed,
    type: flock.type,
    ageDays: flock.logs.length,
    currentCount: flock.currentCount,
    initialCount: flock.initialCount,
    recentPerformance: recentLogs
  });

  const prompt = `
    You are an expert poultry farm veterinarian and operations manager.
    Analyze the following flock data JSON.
    Identify trends in mortality, feed consumption, and weight gain.
    Provide 3 specific operational recommendations.
    Determine an alert level (LOW, MEDIUM, HIGH) based on risks like high mortality or poor feed conversion.
    
    Data: ${dataSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alertLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      analysis: result.analysis || "No analysis generated.",
      recommendations: result.recommendations || [],
      alertLevel: (result.alertLevel as 'LOW' | 'MEDIUM' | 'HIGH') || 'LOW'
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      analysis: "Failed to generate analysis due to a technical error.",
      recommendations: ["Check internet connection.", "Retry analysis."],
      alertLevel: 'LOW'
    };
  }
};

export const diagnoseBirdHealth = async (imageBase64: string): Promise<AnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key not configured.",
      recommendations: ["Configure API Key."],
      alertLevel: 'LOW'
    };
  }

  const prompt = "Analyze this image of a poultry bird. Identify visible signs of illness, injury, or abnormal conditions (e.g., comb color, eye clarity, feather condition, posture). Provide a diagnosis of potential issues, 3 immediate recommendations, and an alert level.";

  // Remove data URL prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alertLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    return {
      analysis: result.analysis || "Could not analyze image.",
      recommendations: result.recommendations || [],
      alertLevel: (result.alertLevel as 'LOW' | 'MEDIUM' | 'HIGH') || 'LOW'
    };

  } catch (error) {
    console.error("Gemini visual diagnosis failed:", error);
    return {
      analysis: "Visual diagnosis failed due to a technical error.",
      recommendations: ["Ensure image is clear.", "Check internet connection."],
      alertLevel: 'LOW'
    };
  }
};

export const analyzeFinancialHealth = async (transactions: Transaction[]): Promise<AnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key not configured.",
      recommendations: ["Configure API Key."],
      alertLevel: 'LOW'
    };
  }

  // Pre-process data to summarize for the model (save tokens)
  const summary = {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    byCategory: {} as Record<string, number>,
    expenseBreakdown: {} as Record<string, number>
  };

  transactions.forEach(t => {
    if (t.type === 'INCOME') {
      summary.totalRevenue += t.amount;
    } else {
      summary.totalExpenses += t.amount;
      summary.expenseBreakdown[t.category] = (summary.expenseBreakdown[t.category] || 0) + t.amount;
    }
    summary.byCategory[t.category] = (summary.byCategory[t.category] || 0) + t.amount;
  });

  summary.netProfit = summary.totalRevenue - summary.totalExpenses;

  // Get top 5 expenses
  const topExpenses = Object.entries(summary.expenseBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([k,v]) => `${k}: ${v}`);

  const prompt = `
    You are a CFO for a commercial poultry farm. Analyze the following financial data summary.
    
    Overview:
    - Total Revenue: ${summary.totalRevenue}
    - Total Expenses: ${summary.totalExpenses}
    - Net Profit: ${summary.netProfit}
    - Profit Margin: ${summary.totalRevenue ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
    
    Top Expense Categories:
    ${topExpenses.join(', ')}

    Task:
    1. Provide a brief financial health assessment (2-3 sentences).
    2. Identify 3 specific areas for cost optimization or revenue growth based on poultry farming standards.
    3. Assign a financial risk alert level (LOW, MEDIUM, HIGH). High risk if loss-making or low margin.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alertLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      analysis: result.analysis || "Analysis could not be generated.",
      recommendations: result.recommendations || [],
      alertLevel: (result.alertLevel as any) || 'LOW'
    };

  } catch (error) {
    console.error("Gemini finance analysis failed:", error);
    return {
      analysis: "Failed to generate financial analysis.",
      recommendations: ["Check data connectivity."],
      alertLevel: 'LOW'
    };
  }
};

export const analyzeSalesPerformance = async (orders: SalesOrder[], customers: Customer[]): Promise<AnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key not configured.",
      recommendations: ["Configure API Key."],
      alertLevel: 'LOW'
    };
  }

  // 1. Data Preparation (Summarize to save tokens)
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Product Breakdown
  const products: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      products[i.description] = (products[i.description] || 0) + i.total;
    });
  });
  const topProducts = Object.entries(products)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([k,v]) => `${k} ($${v})`)
    .join(', ');

  // Customer Segments
  const totalCustomers = customers.length;
  const topSpenders = customers
    .sort((a,b) => b.totalSpent - a.totalSpent)
    .slice(0, 3)
    .map(c => `${c.name} ($${c.totalSpent})`)
    .join(', ');

  const summaryPrompt = `
    Total Revenue: ${totalRevenue}
    Avg Order Value: ${avgOrderValue}
    Total Customers: ${totalCustomers}
    Top Products: ${topProducts}
    Top Customers: ${topSpenders}
  `;

  const prompt = `
    You are a Sales Director for a poultry farm business. Analyze the following sales data summary.
    
    Data:
    ${summaryPrompt}

    Task:
    1. Provide a concise executive summary of sales performance (2 sentences).
    2. Suggest 3 specific strategies to increase revenue (e.g. bundling, new customer acquisition, upsell to top clients).
    3. Determine the 'Growth Potential' alert level (LOW, MEDIUM, HIGH) based on the health of the sales mix.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alertLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      analysis: result.analysis || "Sales analysis unavailable.",
      recommendations: result.recommendations || [],
      alertLevel: (result.alertLevel as any) || 'MEDIUM'
    };

  } catch (error) {
    console.error("Gemini sales analysis failed:", error);
    return {
      analysis: "Failed to generate sales insights.",
      recommendations: ["Check connection."],
      alertLevel: 'LOW'
    };
  }
};

export const analyzeHealthTrends = async (records: MedicalRecord[], flocks: Flock[]): Promise<AnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key not configured.",
      recommendations: ["Configure API Key."],
      alertLevel: 'LOW'
    };
  }

  // 1. Summarize Health Incidents
  const incidents = records.map(r => `${r.type}: ${r.title} (${r.date})`).join('; ');
  
  // 2. Summarize Mortality Stats
  const mortalityStats = flocks.map(f => {
    const mortalityRate = f.initialCount > 0 ? ((f.initialCount - f.currentCount) / f.initialCount) * 100 : 0;
    return `${f.name}: ${mortalityRate.toFixed(1)}% Mortality`;
  }).join('; ');

  const prompt = `
    You are a Veterinary Pathologist specializing in poultry. Analyze the following health records and flock mortality data.
    
    Health Records (Last 60 days):
    ${incidents || "No recent medical records."}

    Flock Mortality Status:
    ${mortalityStats}

    Task:
    1. Provide a clinical assessment of the farm's biosecurity and health status. Look for patterns (e.g. repeated respiratory issues).
    2. Recommend 3 specific veterinary or biosecurity protocols (e.g. vaccination schedule adjustment, quarantine measures).
    3. Assign a 'Biosecurity Risk' level (LOW, MEDIUM, HIGH). High if multiple disease outbreaks or high mortality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            alertLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      analysis: result.analysis || "Health analysis unavailable.",
      recommendations: result.recommendations || [],
      alertLevel: (result.alertLevel as any) || 'LOW'
    };

  } catch (error) {
    console.error("Gemini health analysis failed:", error);
    return {
      analysis: "Failed to generate veterinary insights.",
      recommendations: ["Check connection."],
      alertLevel: 'LOW'
    };
  }
};
