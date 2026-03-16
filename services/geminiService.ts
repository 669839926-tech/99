import { GoogleGenAI, Type } from "@google/genai";
import { TrainingSession, Player } from '../types';

// Helper to get the AI client instance safely.
// In Vite/Browser environments, process.env might not be directly available at module evaluation time.
// We initialize this lazily to prevent 'process is not defined' crashes on app startup.
const getAiClient = () => {
    // Comment: Initialize with API key from environment variable as per guidelines
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Comment: Using gemini-3-flash-preview for basic text tasks like plan generation
const TRAINING_MODEL = 'gemini-3-flash-preview';

export const generateTrainingPlan = async (focus: string, duration: number, intensity: string): Promise<Partial<TrainingSession>> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Create a professional youth football (soccer) training session plan.
      Focus Area: ${focus}
      Duration: ${duration} minutes
      Intensity: ${intensity}

      Return the response in JSON format with a title, and a list of 4-6 specific drills.
      **IMPORTANT: The content (title and drills) must be in Chinese.**
    `;

    // Comment: Call generateContent with model name and contents directly
    const response = await ai.models.generateContent({
      model: TRAINING_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A creative and professional title for the session in Chinese" },
            drills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of drills with time allocations in Chinese"
            }
          },
          required: ["title", "drills"]
        }
      }
    });

    // Comment: Access response.text directly (not a function)
    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from Gemini");
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error generating training plan:", error);
    throw error;
  }
};

export const generateMatchStrategy = async (opponent: string, ourStrengths: string): Promise<string> => {
  try {
    const ai = getAiClient();
     // Comment: Using gemini-3-flash-preview for strategy text generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        我正在管理一支青少年足球队（多特蒙德风格，高位逼抢）。
        我们的下一个对手是 ${opponent}。
        我们球队的优势是：${ourStrengths}。
        
        请用**中文**写一段简明扼要、鼓舞人心的赛前训话（最多150字），并列出3个赢得比赛的关键战术要点。
        使用 Markdown 格式。
      `,
    });

    // Comment: Access response.text directly
    return response.text || "无法生成战术策略。";
  } catch (error) {
    console.error("Error generating match strategy:", error);
    return "连接 AI 助手失败。";
  }
}

export const generatePlayerReview = async (player: Player, quarter: string, year: number): Promise<{tech: string, mental: string, summary: string}> => {
  try {
    const ai = getAiClient();
    const statsStr = JSON.stringify(player.stats);
    const prompt = `
      Act as a professional youth football coach at Borussia Dortmund.
      Generate a quarterly performance review for a player.
      
      Player Name: ${player.name}
      Age: ${player.age}
      Position: ${player.position}
      Stats (1-10 scale): ${statsStr}
      Goals: ${player.goals}, Assists: ${player.assists}
      
      Time Period: ${year} ${quarter}
      
      Output 3 distinct sections in Chinese:
      1. Technical & Tactical Improvement (技战术能力改善)
      2. Mental Development (心理建设)
      3. Quarterly Summary (本季总结)
      
      Keep it encouraging but professional and specific.
    `;

    // Comment: Using gemini-3-flash-preview for player reviews
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    tech: { type: Type.STRING, description: "Technical & Tactical Improvement analysis in Chinese" },
                    mental: { type: Type.STRING, description: "Mental Development analysis in Chinese" },
                    summary: { type: Type.STRING, description: "Quarterly Summary in Chinese" }
                }
            }
        }
    });

    // Comment: Access response.text directly
    const jsonText = response.text;
    if(!jsonText) throw new Error("No text returned");
    return JSON.parse(jsonText);

  } catch (error) {
      console.error("Error generating player review", error);
      throw error;
  }
}
