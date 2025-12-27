import { GoogleGenAI } from "@google/genai";
import { Volume } from "../types.ts";

const getApiKey = () => {
  if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
    return (window as any).process.env.API_KEY;
  }
  return '';
};

const API_KEY = getApiKey();

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const isGeminiConfigured = () => !!API_KEY;

export const askSpideyLibrarian = async (
  query: string, 
  libraryContext: Volume[]
): Promise<string> => {
  if (!ai) return "Sentit aràcnid... desactivat. (No hi ha API Key)";

  const librarySummary = libraryContext.slice(0, 10).map(v => 
    `- ${v.seriesTitle} (${v.volumeNumber})`
  ).join('\n');

  const systemInstruction = `
    Ets en Spider-Man (Peter Parker). Estàs ajudant a organitzar una biblioteca de còmics.
    Parla en Català. Sigues divertit, carismàtic i usa jerga d'heroi.
    
    Biblioteca disponible:
    ${librarySummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "No trobo paraules... potser és culpa de Mysterio.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Tinc problemes amb el senyal de la Teranyina-Xarxa.";
  }
};