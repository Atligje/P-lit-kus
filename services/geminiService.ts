import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { ApiCase, CaseDetails, AlthingiStatus, AlthingiReviewAnalysis, GroundingSource, CaseComment } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const summarizeCaseDetails = async (caseItem: ApiCase, comments: CaseComment[]): Promise<CaseDetails> => {
  const model = "gemini-2.5-flash";

  const commentsText = comments.length > 0
    ? comments.map((c, i) => `Umsögn ${i + 1} frá "${c.contact}":\n${c.comment}\n`).join('\n---\n')
    : "Engar umsagnir bárust.";

  const prompt = `
    Þú ert sérfræðingur í íslenskri stjórnsýslu og löggjöf með djúpa þekkingu á lögfræði og stjórnmálum. 
    Verkefni þitt er að framkvæma ítarlega og hlutlausa greiningu á eftirfarandi máli úr Samráðsgátt.

    **Málsupplýsingar:**
    Titill: "${caseItem.name}"
    Málsnúmer: "${caseItem.caseNumber}"
    Ábyrgðaraðili: "${caseItem.institution}"
    Staða: "${caseItem.statusName}"
    Lýsing: "${caseItem.description}"

    **Innsendar umsagnir (heimild fyrir greiningu):**
    ---
    ${commentsText}
    ---

    **Verkefni:**
    Vinsamlegast greindu málið og skilaðu niðurstöðum ÞÍNUM AÐEINS sem einum JSON hlut sem fylgir nákvæmlega skilgreindu skema. 
    Ekki setja neinn texta fyrir utan JSON hlutinn.

    **Greiningarskref:**

    1.  **Samantekt (summary):** Taktu saman megininntak málsins á skýran og hnitmiðaðan hátt á íslensku.
    2.  **Helstu atriði (keyPoints):** Dragðu út og listaðu upp helstu atriði, markmið og röksemdir frumvarpsins/þingsályktunarinnar.
    3.  **Greining á umsögnum (consultationAnalysis):** Byggt á **RAUNVERULEGUM INNSENDUM UMSÖGNUM** sem fylgja hér að ofan (EKKI lýsingunni):
        *   **Samantekt umsagna (summary):** Gerðu samantekt á þeim umsögnum, ábendingum og athugasemdum sem koma fram.
        *   **Umsagnaraðilar (reviewers):** Búðu til lista yfir alla umsagnaraðila.
        *   **Helstu punktar úr umsögnum (mainPoints):** Taktu saman helstu athugassemdir, tillögur og ábendingar frá umsagnaraðilum í lista.
    4.  **Krefjandi spurningar til ráðherra (questionsForMinister):** Útbúðu lista af 3-5 málefnalegum og krefjandi spurningum til ábyrgðar-ráðherra (${caseItem.institution}). Þessar spurningar skulu byggja bæði á innihaldi málsins sjálfs og þeim athugasemdum sem komu fram í umsögnum.
    5.  **Greining m.t.t. stefnu stjórnvalda (policyAnalysis):** Hafðu til hliðsjónar núgildandi stjórnarsáttmála, fjármálaáætlun og fjárlög ríkisstjórnar Íslands. Greindu hvort áherslur í málinu séu í samræmi við þessi stefnuskjöl. Taktu sérstaklega fram ef málið virðist skorta fjármagn, skýra mælikvarða eða ef það er ekki forgangsmál samkvæmt stefnu stjórnvalda.
    6.  **Drög að 10 mínútna ræðu (speechDraft):** Semdu drög að 10 mínútna ræðu um málið. Ræðan skal vera málefnaleg, uppbyggileg og jákvæð í grunninn. Hún á að draga fram það sem vel er gert en jafnframt benda á það sem betur mætti fara, með rökstuðningi. Vitnaðu í atriði úr umsögnum ef við á. Ræðan skal vera á íslensku.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Hnitmiðuð samantekt á málinu á íslensku." },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Listi yfir helstu atriði og markmið málsins." },
            questionsForMinister: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Listi af krefjandi spurningum til ráðherra." },
            consultationAnalysis: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: "Samantekt á umsögnum úr Samráðsgátt." },
                reviewers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Listi yfir umsagnaraðila." },
                mainPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Helstu athugasemdir og tillögur úr umsögnum." }
              },
              required: ["summary", "reviewers", "mainPoints"]
            },
            policyAnalysis: { type: Type.STRING, description: "Greining á málinu í samhengi við stefnu stjórnvalda (stjórnarsáttmáli, fjárlög o.fl.)." },
            speechDraft: { type: Type.STRING, description: "Drög að 10 mínútna ræðu um málið á íslensku." }
          },
          required: ["summary", "keyPoints", "questionsForMinister", "consultationAnalysis", "policyAnalysis", "speechDraft"]
        },
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error summarizing case details with Gemini:", error);
    throw new Error("Failed to generate case summary.");
  }
};

export const searchAlthingi = async (title: string): Promise<AlthingiStatus> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    As an Icelandic political analyst, perform a real-time web search focused *only* on the Icelandic Parliament's website (althingi.is) to find the latest status and any related documents for the following case: "${title}".

    Summarize your findings in Icelandic. If no specific updates or related bills are found on althingi.is, state that clearly in Icelandic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const description = response.text;
    // FIX: The type from the Gemini API for grounding chunks has optional properties,
    // but the app's 'GroundingSource' type requires them. This transforms the API
    // response to match the app's type, ensuring 'uri' is present and providing a fallback for 'title'.
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources: GroundingSource[] = groundingChunks.flatMap(chunk => {
      if (chunk.web?.uri) {
        return [{
          web: {
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri,
          }
        }];
      }
      return [];
    });

    return { description, sources };

  } catch (error) {
    console.error("Error searching Althingi with Gemini:", error);
    throw new Error("Failed to search Althingi for updates.");
  }
};

export const analyzeAlthingiReviews = async (title: string): Promise<AlthingiReviewAnalysis> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Þú ert sérfræðingur í íslenskri stjórnsýslu og störfum Alþingis. Verkefni þitt er að framkvæma vef leit eingöngu á vefsvæði Alþingis (althingi.is) til að finna umsagnir sem borist hafa um eftirfarandi mál: "${title}".

    **Verkefni:**
    1. Finndu málið á vef Alþingis og hvaða nefnd það hefur til meðferðar.
    2. Finndu lista yfir umsagnir ("erindi") sem borist hafa til nefndarinnar um málið.
    3. Greindu hverja umsögn og búðu til lista yfir umsagnaraðila.
    4. Fyrir hvern umsagnaraðila, ákvarðaðu afstöðu þeirra til málsins (verður að vera eitt af þessum gildum: "Jákvæð", "Neikvæð", eða "Hlutlaus").
    5. Taktu saman í stuttu máli helstu athugasemdir, ábendingar, eða tillögur hvers umsagnaraðila.
    6. Gerðu stutta heildarsamantekt á niðurstöðum greiningarinnar.

    **Skil:**
    Skilaðu niðurstöðum ÞÍNUM AÐEINS sem einum JSON hlut. JSON hluturinn á að innihalda 'analysisSummary' (strengur) og 'reviews' (fylki af hlutum þar sem hver hlutur hefur 'reviewer' (strengur), 'stance' (strengur sem er "Jákvæð", "Neikvæð", eða "Hlutlaus"), og 'summary' (strengur)). Ekki setja neinn texta fyrir utan JSON hlutinn, og EKKI vefja það inn í markdown \`\`\`json blokk. Ef engar umsagnir finnast, skilaðu JSON hlut með tómum 'reviews' lista og viðeigandi samantekt í 'analysisSummary'.
  `;
  
  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Removed responseMimeType and responseSchema to fix API error.
        // The Gemini API does not support using tools with a forced JSON response.
        // The prompt has been strengthened to ensure JSON output.
      },
    });
    
    responseText = response.text;
    
    // Robustly find the JSON object within the response text, even if it's
    // surrounded by conversational text or markdown.
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      responseText = responseText.substring(startIndex, endIndex + 1);
    } else {
        // If we can't find a JSON object, the response is invalid.
        // Log it for debugging and let the JSON.parse below handle the error.
        console.error("Could not extract a valid JSON object from the response string:", responseText);
    }
    
    const parsedResponse = JSON.parse(responseText.trim());

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources: GroundingSource[] = groundingChunks.flatMap(chunk => {
      if (chunk.web?.uri) {
        return [{
          web: {
            uri: chunk.web.uri,
            title: chunk.web.title || chunk.web.uri,
          }
        }];
      }
      return [];
    });

    return { ...parsedResponse, sources };

  } catch (error) {
    console.error("Error analyzing Althingi reviews with Gemini:", error);
    if (error instanceof SyntaxError) {
      console.error("Failed to parse JSON from Gemini response:", responseText);
      throw new Error("Gat ekki unnið úr svari frá gervigreind. Svarið var ekki á réttu JSON formi.");
    }
    throw new Error("Failed to analyze Althingi reviews.");
  }
};


export const generateImage = async (prompt: string): Promise<string> => {
  const model = 'imagen-4.0-generate-001';
  try {
    const response = await ai.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image with Imagen:", error);
    throw new Error("Failed to generate image.");
  }
};

export const createChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'Þú ert Pólitíkus, hjálpsamur og vinalegur spjallþjarkur með sérþekkingu á íslenskri stjórnsýslu. Nafnið þitt er Pólitíkus. Svör þín eiga alltaf að vera á íslensku. Vertu hnitmiðaður og skýr í svörum þínum.',
    },
  });
};