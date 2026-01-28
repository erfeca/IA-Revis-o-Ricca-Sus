
import { GoogleGenAI, Type } from "@google/genai";
import { ReviewResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const reviewTextWithGemini = async (
  targetText: string,
  referenceTexts: string[]
): Promise<ReviewResult> => {
  const referenceContext = referenceTexts.length > 0 
    ? `Utilize as seguintes regras gramaticais e guias de estilo como referência prioritária:\n${referenceTexts.join('\n---\n')}`
    : "Siga as normas padrão da língua portuguesa (Acordo Ortográfico vigente).";

  const prompt = `
    Você é um linguista sênior e revisor profissional de textos em Português.
    Sua tarefa é revisar o "Texto Alvo" fornecido abaixo.
    
    O texto contém marcadores de página no formato [[PÁGINA X]]. 
    Sua tarefa é identificar erros e para cada correção, informar em qual página ela foi encontrada.
    
    INSTRUÇÕES:
    1. Corrija erros ortográficos, gramaticais, de pontuação e de concordância.
    2. Aplique as regras de referência fornecidas, se houver.
    3. Mantenha o tom original do texto, mas melhore a clareza se necessário.
    4. Remova os marcadores [[PÁGINA X]] do "fullCorrectedText" final para que ele fique limpo.
    5. Para cada item em "corrections", preencha o "pageNumber" com o número da página onde o erro foi localizado.
    
    REGRAS DE REFERÊNCIA:
    ${referenceContext}
    
    TEXTO ALVO:
    ${targetText}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullCorrectedText: {
            type: Type.STRING,
            description: "O texto completo limpo (sem marcadores de página) após todas as correções."
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING },
                pageNumber: { 
                  type: Type.INTEGER,
                  description: "O número da página extraído dos marcadores [[PÁGINA X]] onde o erro ocorreu."
                },
                type: { 
                    type: Type.STRING,
                    description: "Categoria da correção: 'orthography', 'grammar', 'style' ou 'punctuation'"
                }
              },
              required: ["original", "corrected", "explanation", "type", "pageNumber"]
            }
          },
          score: {
            type: Type.NUMBER,
            description: "Uma nota de 0 a 100 para a qualidade original do texto."
          }
        },
        required: ["fullCorrectedText", "corrections", "score"]
      },
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return result as ReviewResult;
};
