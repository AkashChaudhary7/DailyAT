import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the GoogleGenAI client on the backend with safety checks
let aiClient: GoogleGenAI | null = null;
const getGeminiClient = (): GoogleGenAI => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the backend environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API router mappings BEFORE Vite middleware setup for container routes
  app.post("/api/classify-questions", async (req, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Invalid payload or empty questions batch." });
      }

      // Check if API key is present
      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({
          success: false,
          fallbackRequired: true,
          message: "GEMINI_API_KEY is absent. Running on high-performance regex fallback."
        });
      }

      const client = getGeminiClient();

      // We'll prepare a structured prompt containing the questions batch
      const questionsData = questions.map((q: any) => ({
        id: q.id,
        text: q.questionText,
        options: q.options || []
      }));

      const prompt = `Analyze these exam questions and classify each of them into a standard competitive exam subject (one of: "Polity", "History", "Geography", "Culture", "Science", "Mathematics", "Reasoning", "Hindi", "English", "Computer", "Current Affairs", "Sports", "General Studies").
Assign a granular tag portraying standard topics:
1. "Geography" questions:
   - If question refers to global features (countries, oceans of world, continents, international rivers, climates, global winds, solar system, etc.), output Subject="Geography", Tag="World Geography".
   - If question is Rajasthan-related, output Subject="Geography", Tag="Rajasthan Geography".
   - Otherwise, output Subject="Geography", Tag="Indian Geography".
2. "Polity" questions:
   - If question contains reference to Rajasthan (e.g., assembly, governors, local panchayats, Chief Minister, etc.), output Subject="Polity", Tag="Rajasthan Polity".
   - Otherwise, output Subject="Polity", Tag="Indian Polity".
3. "History" questions:
   - If Rajasthan-related, output Subject="History", Tag="Rajasthan History".
   - Otherwise, output Subject="History", Tag="Indian History".
4. "Culture" / "Art & Culture" questions:
   - If Rajasthan-related, output Subject="Culture", Tag="Rajasthan Art & Culture".
   - Otherwise, output Subject="Culture", Tag="Indian Art & Culture".
5. "Science" / "General Science" questions:
   - Output Subject="Science", Tag="General Science".
6. "Computer" questions:
   - Output Subject="Computer", Tag="Computer Awareness" (or sub-tags like "Internet & Email", "MS Office", "Computer Hardware").
7. "Hindi" questions:
   - Output Subject="Hindi", Tag="Hindi Grammar" (or "Hindi Literature").
8. "English" questions:
   - Output Subject="English", Tag="English Grammar" (or "English Vocabulary").
9. "Mathematics" and "Reasoning":
   - Output Subject="Mathematics", Tag="Quantitative Aptitude".
   - Output Subject="Reasoning", Tag="Logical Reasoning".
10. "Current Affairs" and "Sports":
   - Use standardized tags like "Current Affairs 2026", "Sports & Awards".

Return the output strictly matching the requested JSON format.

Questions to analyze:
${JSON.stringify(questionsData, null, 2)}`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert exam academic classifier. For each question, decide the most appropriate standard subject (Polity, History, Geography, Culture, Science, Mathematics, Reasoning, Hindi, English, Computer, Current Affairs, Sports) and map its topic/tag to standard categories (such as Rajasthan Polity, Indian Polity, Rajasthan History, Indian History, Rajasthan Geography, Indian Geography, World Geography, Rajasthan Art & Culture, Indian Art & Culture, General Science, Computer Awareness, Hindi Grammar, English Grammar, Quantitative Aptitude, Logical Reasoning) based on the text context.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classifications: {
                type: Type.ARRAY,
                description: "Array of classified items accompanying their question IDs",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    subject: { type: Type.STRING, description: "Standardized subject" },
                    tag: { type: Type.STRING, description: "Highly specific sub-brand or topic (e.g. Rajasthan Polity, Indian Polity, etc.)" }
                  },
                  required: ["id", "subject", "tag"]
                }
              }
            },
            required: ["classifications"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsedOutput = JSON.parse(responseText.trim());

      res.json({
        success: true,
        classifications: parsedOutput.classifications || []
      });
    } catch (err: any) {
      console.error("[Backend AI Classifier] Error processing batch:", err);
      res.status(500).json({
        success: false,
        fallbackRequired: true,
        error: err.message || "Failed during Gemini processing execution batch."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

