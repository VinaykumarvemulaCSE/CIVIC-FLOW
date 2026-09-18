import { createServerFn } from "@tanstack/react-start";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Image analysis agent.
 *
 * The Review agent sends the uploaded photo here; the model reads the picture
 * and returns what it can see plus a damage score, which the Severity agent uses.
 */

const inputSchema = z.object({
  /** data: URL of the compressed photo captured in the browser. */
  image: z.string().min(32).max(9_000_000),
  title: z.string().max(200),
  description: z.string().max(2000),
});

const analysisSchema = z.object({
  isRelevant: z.boolean(),
  category: z.enum([
    "pothole",
    "streetlight",
    "water_leakage",
    "garbage",
    "drainage",
    "traffic_signal",
    "other",
  ]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  damageScore: z.number(),
  hazards: z.array(z.string()),
  observed: z.string(),
  confidence: z.number(),
});

export type PhotoAnalysis = z.infer<typeof analysisSchema>;

const SYSTEM = `You are the image analysis agent of a municipal complaint triage system.
Look at the photo of reported public infrastructure damage and report only what is visible.
Rules:
- isRelevant is false if the photo does not show public infrastructure damage at all.
- damageScore is 0-100: extent and danger of the visible damage (0 = nothing wrong, 100 = immediate danger to life).
- severity: critical = someone can be hurt today (live wire, deep open pit, sinkhole, flooding, blocked road);
  high = serious damage, worsening fast; medium = clear defect, no immediate danger; low = cosmetic.
- hazards: at most 4 short phrases naming what makes it dangerous (e.g. "exposed wiring", "standing water", "no barricade").
- observed: one or two plain sentences describing the photo, for an officer to read.
- confidence is 0-1 for how sure you are.
Never invent details you cannot see in the photo.`;

export const analyzeComplaintPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PhotoAnalysis> => {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("Image analysis is not configured (missing OPENAI_API_KEY)");

    const google = createGoogleGenerativeAI({
      apiKey: key,
    });

    const result = await generateObject({
      model: google("gemini-1.5-flash"),
      system: SYSTEM,
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Citizen report title: ${data.title}\nCitizen description: ${data.description}\nAnalyse the attached photo.`,
            },
            { type: "image", image: new URL(data.image) },
          ],
        },
      ]
    });

    const analysis = result.object;
    return {
      ...analysis,
      damageScore: Math.max(0, Math.min(100, Math.round(analysis.damageScore))),
      confidence: Math.max(0, Math.min(1, analysis.confidence)),
      hazards: analysis.hazards.slice(0, 4),
      observed: analysis.observed.slice(0, 400),
    };
  });
