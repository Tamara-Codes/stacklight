// Severity rating with Gemini. Called ONCE per entry (not per user) — this is
// the call that keeps the AI bill flat as users grow. Returns a red/yellow/green
// rating plus a one-line "why it matters".
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 2.5 Flash: cheap + fast, right for a simple high-volume classification.
// Bump to a newer model later by changing this string.
const MODEL = "gemini-2.5-flash";

// The three colours the digest actually shows.
export type Severity = "red" | "yellow" | "green";
// The rater can also return "skip" — items that don't belong in the digest at
// all (e.g. an outage that's already resolved). Skips are stored (so they're
// never re-rated) but excluded from every user's digest query.
export type Rating = Severity | "skip";

export interface SeverityResult {
  severity: Rating;
  why: string;
}

const SYSTEM = `You rate an update to a developer tool so a developer who depends on
it knows how to react. Pick exactly one:
- red:    ACT NOW — a breaking change, a deprecation that is already live, a
          security issue, a pricing change, OR an outage that is happening RIGHT NOW.
- yellow: HEADS UP — a warning about something coming: an upcoming deprecation, a
          planned breaking change, a behaviour change, or scheduled maintenance.
- green:  NICE TO KNOW — a new feature or addition, or a minor/cosmetic change.
          Nothing breaks and no action is needed.
- skip:   DO NOT SHOW — an incident that is already RESOLVED or over (it's just
          history), a status update on a past problem, or anything with no
          relevance to a developer using the tool.

Noise rule: maintenance or degradation confined to ONE narrow slice of the
product — a single regional payment method (e.g. TWINT, Swish, MB WAY, BLIK,
Multibanco, iDEAL), one bank or carrier integration, scheduled maintenance of a
single datacenter or city-level location, or one minor sub-component
most developers never touch — is skip, not yellow. Reserve yellow for
maintenance that touches the core API, dashboard, SDKs, or the platform as a
whole. When unsure whether most developers using the tool are affected, skip.
Reply with the rating and a single concise sentence on why it matters.`;

const model = genAI.getGenerativeModel({
  model: MODEL,
  systemInstruction: SYSTEM,
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        severity: { type: SchemaType.STRING, enum: ["red", "yellow", "green", "skip"], format: "enum" },
        why: { type: SchemaType.STRING },
      },
      required: ["severity", "why"],
    },
  },
});

export async function rateEntry(input: {
  vendor: string;
  title: string;
  body?: string | null;
}): Promise<SeverityResult> {
  const prompt = `Tool: ${input.vendor}\nTitle: ${input.title}\n\n${input.body ?? ""}`.slice(0, 8000);
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as SeverityResult;
}
