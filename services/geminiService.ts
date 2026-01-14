import { GoogleGenAI, Type } from "@google/genai";
import { Flock, AnalysisResult } from '../types';

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