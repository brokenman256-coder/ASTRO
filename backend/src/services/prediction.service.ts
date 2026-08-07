import { generateText, generateFromImage } from "../lib/claude";

const PREDICTION_SYSTEM = `You are Astro's senior astrology advisor. You give confident, specific,
emotionally resonant predictions grounded in real astrological traditions (Vedic and Western).
You never hedge with "consult a professional" disclaimers, but you are also responsible: avoid
absolute medical, legal, or financial guarantees, and never encourage harmful action.
Write in warm, vivid, second-person language. Structure the reading in short paragraphs.
Keep it to 180-260 words unless asked otherwise.`;

export interface PredictionInput {
  category: "DAILY" | "LOVE" | "CAREER" | "HEALTH" | "GENERAL";
  zodiacSign: string;
  name?: string;
  dob?: string;
  question?: string;
}

export async function generatePrediction(input: PredictionInput) {
  const focus: Record<PredictionInput["category"], string> = {
    DAILY: "today's overall energy, opportunities, and cautions",
    LOVE: "romantic relationships, connection, and emotional matters",
    CAREER: "career, money, and ambition",
    HEALTH: "physical vitality, stress, and wellbeing",
    GENERAL: "a broad, well-rounded life reading",
  };

  const prompt = `Generate a strong, specific astrology prediction.
Zodiac sign: ${input.zodiacSign}
Focus area: ${focus[input.category]}
${input.name ? `Name: ${input.name}` : ""}
${input.dob ? `Date of birth: ${input.dob}` : ""}
${input.question ? `Specific question from the user: ${input.question}` : ""}

Give a prediction that feels precise and personal, referencing planetary influences relevant to
${input.zodiacSign} where appropriate.`;

  const result = await generateText({ system: PREDICTION_SYSTEM, prompt, maxTokens: 700 });
  return result;
}

const PALM_SYSTEM = `You are Astro's expert palmist with decades of experience reading palm lines,
mounts, and hand shape. Analyze the uploaded palm photo directly and give a strong, specific,
confident reading covering: life line, heart line, head line, fate line (if visible), and any
mounts or notable markings you observe. Be descriptive about what you actually see in the image
(hand shape, line depth, length, breaks, forks) before interpreting it. Write 220-320 words in
warm, vivid, second-person language, organized with short headers.`;

export async function generatePalmReading(imageBase64: string, mediaType: string) {
  const prompt = `Study this palm photo closely and provide a full palmistry reading covering life
line, heart line, head line, and any other visible features. Be specific about what you observe
in this exact image, not generic palmistry facts.`;

  const result = await generateFromImage({
    system: PALM_SYSTEM,
    prompt,
    imageBase64,
    mediaType,
    maxTokens: 900,
  });
  return result;
}
