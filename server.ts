import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for English Grammar Correction and Situational Rewrite
  app.post("/api/rewrite", async (req, res) => {
    try {
      const { text, intensity = "moderate", spellingOnly = false } = req.body;
      if (!text || typeof text !== "string" || text.trim() === "") {
        return res.status(400).json({ error: "Please enter a sentence to evaluate." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured on the server. Please add it via the Secrets panel in AI Studio settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

const STATIC_SITUATIONS = {
  professional: {
    label: "Professional",
    description: "Clean, polished, and structured. Perfect for business emails, workplace chat, and formal speech."
  },
  casual: {
    label: "Casual",
    description: "Relaxed and conversational. Great for friends, family, and direct messaging."
  },
  polite: {
    label: "Polite",
    description: "Warm, diplomatic, and soft-spoken. Keeps tone completely neutral and pleasant."
  },
  concise: {
    label: "Concise",
    description: "Straight to the point without fluff. Delivers high impact with minimal words."
  },
  assertive: {
    label: "Assertive",
    description: "Confident and commanding. Strong active voice to make a firm point."
  },
  creative: {
    label: "Creative",
    description: "Expressive, conversational, and energetic. Infuses color and style into the context."
  }
};

const STATIC_SOCIAL_SITUATIONS = {
  instagram: {
    label: "Instagram Caption",
    description: "Aesthetic and engaging with micro-spacing, descriptive emojis, and relevant hashtags."
  },
  x: {
    label: "X (Twitter) Post",
    description: "Punchy, hook-oriented, and highly concise. Designed under character counts to invite organic shares."
  },
  reddit: {
    label: "Reddit Content",
    description: "Raw, conversational, and authentic. Framed cleanly with a peer-to-peer authentic voice."
  },
  linkedin: {
    label: "LinkedIn Idea",
    description: "Structured, career insights, and thought-provoking. Structured with clean spaces and a strong hook."
  },
  threads: {
    label: "Threads Post",
    description: "Witty, casual, and highly dialogical. Perfect for organic banter and conversational threads."
  }
};

const intensityInstruction = 
  intensity === "subtle"
    ? "CRITICAL REWRITE AGGRESSIVENESS LIMIT (SUBTLE): You MUST perform extremely minor corrections. Correct only strict grammar mistakes and syntax errors. Retain the original words, syntax, and sentence structure as much as possible. Avoid sweeping rephrases or fancy wording."
    : intensity === "radical"
    ? "CRITICAL REWRITE AGGRESSIVENESS SPEC (RADICAL): You are fully authorized to radically rewrite and restructure the sentences. Drastically improve vocabulary, elevate the flow, and polish the phrasing to sound extremely articulate and powerful, even if the sentence is completely transformed."
    : "CRITICAL REWRITE AGGRESSIVENESS SPEC (MODERATE): Maintain a balanced level of rewrites. Perform standard grammar corrections and natural stylistic improvements, keeping a smooth, moderate flow.";

const systemInstruction = spellingOnly
  ? `You are "Seed Eng", an extremely fast, high-precision spelling-only corrector.
CRITICAL SPELLING-ONLY SPECIFICATION:
- You MUST scan the input text and ONLY correct misspelled words, typos, and simple spacing/obvious spelling errors.
- You MUST NOT change any grammar, vocabulary, sentence structure, word order, active/passive voice, punctuation (except for critical spelling apostrophes like cant -> can't, dont -> don't), or style of the original sentence.
- Keep everything in the sentence exactly as original, even if there are slang, casual elements, poor grammar, or run-on structures. Correct ONLY the spelling errors.
- In "mistakesFound", list only spelling mistakes corrected (e.g. 'Corrected [misspelled word] to [correct spelling]'). If there are no spelling errors, write ["Sentence spelling is already perfect!"].
- To satisfy spelling-only requirements, you MUST provide the EXACT same spelling-corrected sentence on all situational keys and social keys ("correctedText", "professional", "casual", "polite", "concise", "assertive", "creative", "instagram", "x", "reddit", "linkedin", "threads") so they remain strictly spellchecked-only.

Ensure your JSON output matches this schema exactly:
{
  "correctedText": "The spelling-corrected version of the input, keeping original grammar unchanged",
  "mistakesFound": ["Brief details of spelling errors corrected"],
  "situations": {
    "professional": "The spelling-corrected sentence",
    "casual": "The spelling-corrected sentence",
    "polite": "The spelling-corrected sentence",
    "concise": "The spelling-corrected sentence",
    "assertive": "The spelling-corrected sentence",
    "creative": "The spelling-corrected sentence"
  },
  "social": {
    "instagram": "The spelling-corrected sentence",
    "x": "The spelling-corrected sentence",
    "reddit": "The spelling-corrected sentence",
    "linkedin": "The spelling-corrected sentence",
    "threads": "The spelling-corrected sentence"
  }
}`
  : `You are "Seed Eng", an extremely fast, polished grammar corrector and professional linguistic rewriter.
${intensityInstruction}

Your task is to take a raw input sentence (which may contain grammatical, spelling, or punctuation errors) and perform these steps:
1. Make a perfect grammatical correction of the input according to the rewrite aggressiveness rules defined above. Keep the general message unchanged, but fix all linguistic mistakes. Keep the corrected baseline text elegant.
2. Formulate helpful, polite, and very brief bullet points detailing what mistakes were found and why they were corrected. (If the sentence is already perfect, write ["Sentence is already grammatically perfect! Here are alternative styles to express it."]).
3. Provide rewritten versions of the corrected sentence optimized for specific situational contexts. Do not generate descriptions or labels, only map the texts to the static context keys.
4. Provide rewritten versions of the corrected sentence optimized for platform-specific social media niches: instagram, x (formerly Twitter), reddit, linkedin, and threads. Utilize typical formatting constructs corresponding to each environment (such as subtle emojis for Instagram, professional spacing layouts for LinkedIn).

CRITICAL CONTEXT RULE FOR SOCIAL MEDIA REWRITES:
- You MUST absolutely preserve the exact semantic intent, message, core assertion, and facts of the original sentence.
- You are STRICTLY FORBIDDEN from inventing unrelated promotional hooks, random marketing slogans, imaginary business details, fake stories, or changing the subject of the sentence.
- Do not hallucinate or add product pitches unless the user's original sentence is already a product pitch. Just rewrite the SAME core topic/fact adjusted to the stylistic layout, tone, punctuation rhythm, or emoji expression of that social platform. For example, if the input is "I went to get groceries", the LinkedIn rewrite should stylize its formatting or professional spin on THAT event, NOT talk about a fake B2B SaaS launch.

Ensure your JSON output matches this schema exactly, generating ONLY the custom text values for each situations key and social key:
{
  "correctedText": "The corrected version of the input",
  "mistakesFound": ["mistake 1 details", "mistake 2 details"],
  "situations": {
    "professional": "The sentence rewritten professionally",
    "casual": "The sentence rewritten casually",
    "polite": "The sentence rewritten politely",
    "concise": "The sentence rewritten concisely",
    "assertive": "The sentence rewritten assertively",
    "creative": "The sentence rewritten creatively"
  },
  "social": {
    "instagram": "Instagram content",
    "x": "X content",
    "reddit": "Reddit content",
    "linkedin": "LinkedIn content",
    "threads": "Threads content"
  }
}`;

      // Helper function with exponential retries and fallback models
      const generateWithFallbackAndRetry = async () => {
        const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
        let lastError: any = null;

        for (const model of models) {
          let attempts = 3;
          let delay = 1000;

          for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
              console.log(`[Seed Eng API] Contacting ${model} (Attempt ${attempt}/${attempts})...`);
              const response = await ai.models.generateContent({
                model,
                contents: `Analyze, correct grammar, and rewrite this sentence: "${text.trim()}"`,
                config: {
                  systemInstruction,
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: "OBJECT",
                    properties: {
                      correctedText: { 
                        type: "STRING",
                        description: "The grammatically correct standard English version."
                      },
                      mistakesFound: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Array of brief bullets detailing mistakes."
                      },
                      situations: {
                        type: "OBJECT",
                        properties: {
                          professional: { type: "STRING" },
                          casual: { type: "STRING" },
                          polite: { type: "STRING" },
                          concise: { type: "STRING" },
                          assertive: { type: "STRING" },
                          creative: { type: "STRING" }
                        },
                        required: ["professional", "casual", "polite", "concise", "assertive", "creative"]
                      },
                      social: {
                        type: "OBJECT",
                        properties: {
                          instagram: { type: "STRING" },
                          x: { type: "STRING" },
                          reddit: { type: "STRING" },
                          linkedin: { type: "STRING" },
                          threads: { type: "STRING" }
                        },
                        required: ["instagram", "x", "reddit", "linkedin", "threads"]
                      }
                    },
                    required: ["correctedText", "mistakesFound", "situations", "social"]
                  }
                }
              });
              return response;
            } catch (error: any) {
              lastError = error;
              const errMsg = String(error?.message || "");
              console.warn(`[Seed Eng AI Warning] Model ${model} failed on attempt ${attempt}: ${errMsg}`);

              const isTransient = errMsg.includes("503") || errMsg.includes("demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || error?.status === 503 || error?.code === 503;
              if (!isTransient) {
                break; // If configuration error, skip to next model or exit
              }

              if (attempt < attempts) {
                console.log(`[Seed Eng API] Transient error detected. Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
              }
            }
          }
        }
        throw lastError || new Error("All active translation models are currently busy. Please refresh or try again in a few seconds.");
      };

      const response = await generateWithFallbackAndRetry();

      const responseText = response.text ? response.text.trim() : "{}";
      let parsedData: any;
      try {
        parsedData = JSON.parse(responseText);
      } catch (jsonErr: any) {
        console.error("[Seed Eng Server Error] Failed to parse JSON response from Gemini model. Raw Response Text:", responseText);
        throw new Error(`The AI Model returned an invalid JSON block: ${jsonErr.message || ""}`);
      }

      // Reconstruct the full situations schema expects by client (id, label, description, text)
      const mappedSituations = Object.entries(STATIC_SITUATIONS).map(([id, meta]) => {
        const situationKey = id as keyof typeof STATIC_SITUATIONS;
        return {
          id,
          label: meta.label,
          description: meta.description,
          text: parsedData.situations?.[situationKey] || parsedData.correctedText || ""
        };
      });

      // Reconstruct the full social situations schema expects by client
      const mappedSocial = Object.entries(STATIC_SOCIAL_SITUATIONS).map(([id, meta]) => {
        const socialKey = id as keyof typeof STATIC_SOCIAL_SITUATIONS;
        return {
          id,
          label: meta.label,
          description: meta.description,
          text: parsedData.social?.[socialKey] || parsedData.correctedText || ""
        };
      });

      const responsePayload = {
        correctedText: parsedData.correctedText || "",
        mistakesFound: parsedData.mistakesFound || [],
        situations: mappedSituations,
        socialMedia: mappedSocial
      };

      res.json(responsePayload);
    } catch (error: any) {
      console.error("Gemini API Error in /api/rewrite:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Fallback API route to prevent HTML 404 pages when fetching non-existent API endpoints
  app.all("/api/*", (req, res) => {
    console.warn(`[Seed Eng API Warning] 404 Fallback hit: Request to invalid API endpoint "${req.method} ${req.originalUrl}"`);
    res.status(404).json({
      error: `API Endpoint "${req.method} ${req.originalUrl}" not found.`
    });
  });

  // Serve static application
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
