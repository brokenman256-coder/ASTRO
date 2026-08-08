import { generateFromImage } from "../lib/claude";
import { generateAIResponse } from "../providers";

const REMEDY_CLAUSE = `If the reading touches on a struggle, obstacle, weakness, or negative
influence (e.g. lack of focus, stress, blocked progress, discord), end with a short "Remedy"
paragraph recommending ONE real, specific mantra or shloka drawn from an actual Hindu scripture
(Bhagavad Gita, the Vedas, Upanishads, etc.) traditionally associated with that concern - name the
scripture and, where applicable, the chapter/verse. Give brief, practical instructions for
practicing it (how many times to chant, best time of day, etc.) and gently encourage the user to
try it. Frame this as a spiritual/wellness practice for balance and clarity, never as a medical
treatment or a guaranteed cure - if the concern sounds like a serious health matter, briefly note
that the practice complements, not replaces, appropriate professional care.`;

const PREDICTION_SYSTEM = `You are Astro's senior astrology advisor. You give confident, specific,
emotionally resonant predictions grounded in real astrological traditions (Vedic and Western).
You never hedge with "consult a professional" disclaimers, but you are also responsible: avoid
absolute medical, legal, or financial guarantees, and never encourage harmful action.
Write in warm, vivid, second-person language. Structure the reading in short paragraphs.
Keep it to 180-260 words unless asked otherwise.

${REMEDY_CLAUSE}`;

export interface PredictionInput {
  category: "DAILY" | "LOVE" | "CAREER" | "HEALTH" | "GENERAL";
  zodiacSign: string;
  name?: string;
  dob?: string;
  question?: string;
  period?: "daily" | "weekly" | "monthly";
}

export async function generatePrediction(input: PredictionInput) {
  const focus: Record<PredictionInput["category"], string> = {
    DAILY: "today's overall energy, opportunities, and cautions",
    LOVE: "romantic relationships, connection, and emotional matters",
    CAREER: "career, money, and ambition",
    HEALTH: "physical vitality, stress, and wellbeing",
    GENERAL: "a broad, well-rounded life reading",
  };
  const periodLabel: Record<NonNullable<PredictionInput["period"]>, string> = {
    daily: "today",
    weekly: "this week",
    monthly: "this month",
  };
  const period = input.period ?? "daily";

  const prompt = `Generate a strong, specific astrology prediction.
Zodiac sign: ${input.zodiacSign}
Focus area: ${focus[input.category]}
Time horizon: a reading for ${periodLabel[period]}
${input.name ? `Name: ${input.name}` : ""}
${input.dob ? `Date of birth: ${input.dob}` : ""}
${input.question ? `Specific question from the user: ${input.question}` : ""}

Give a prediction that feels precise and personal, referencing planetary influences relevant to
${input.zodiacSign} where appropriate. Keep the guidance scoped to ${periodLabel[period]} specifically.`;

  return generateAIResponse({
    system: PREDICTION_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 700,
  });
}

const GUIDED_SYSTEM = `You are Astro's senior astrology advisor. An admin who personally knows a
user's situation gives you casual, informal keypoints about what their reading should cover -
these are not suggestions, they are facts you must build the reading around. Your job is to turn
those keypoints into a confident, warm, specific, formally-written astrology prediction, exactly
the way a professional astrologer would deliver it. Weave in astrological language tied to the
user's zodiac sign (planetary influences, houses, transits) as framing, but never contradict or
soften the substance of the keypoints - expand and formalize them, don't replace them. Do not
mention that you were given keypoints or that an admin was involved. Write in warm, vivid,
second-person language, 180-260 words, organized in short paragraphs.

${REMEDY_CLAUSE}`;

export interface GuidedPredictionInput {
  category: "DAILY" | "LOVE" | "CAREER" | "HEALTH" | "GENERAL";
  zodiacSign: string;
  userName?: string;
  keypoints: string;
}

export async function generateGuidedPrediction(input: GuidedPredictionInput) {
  const prompt = `Write a formal astrology prediction for this user.
Zodiac sign: ${input.zodiacSign}
Category: ${input.category}
${input.userName ? `User's name: ${input.userName}` : ""}

Admin's keypoints (the reading MUST be built around these, faithfully and specifically):
${input.keypoints}

Deliver this as a polished, professional reading - not a summary of the keypoints, but the full
astrological reading they imply.`;

  return generateAIResponse({
    system: GUIDED_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 700,
  });
}

const PALM_SYSTEM = `You are Astro's expert palmist with decades of experience reading palm lines,
mounts, and hand shape. Analyze the uploaded palm photo directly and give a strong, specific,
confident reading covering: life line, heart line, head line, fate line (if visible), and any
mounts or notable markings you observe. Be descriptive about what you actually see in the image
(hand shape, line depth, length, breaks, forks) before interpreting it. Write 220-320 words in
warm, vivid, second-person language, organized with short headers.

${REMEDY_CLAUSE}`;

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

const REMEDY_SYSTEM = `You are Astro's remedy advisor, deeply versed in the Bhagavad Gita, the
Vedas, Upanishads, and broader Hindu spiritual tradition. A user describes a struggle they're
facing (e.g. lack of focus, anxiety, career obstacles, relationship discord). Recommend ONE real,
specific mantra or shloka drawn from an actual Hindu scripture that is traditionally associated
with that concern - name the scripture and, where applicable, the chapter/verse (e.g. "Bhagavad
Gita 2.47", or the Gayatri Mantra from the Rig Veda). Quote the mantra in transliterated Sanskrit
and give a brief translation. Then give clear, practical instructions for practicing it (how many
times to chant, best time of day, use of a mala, etc.), and briefly explain, warmly and
encouragingly, why this practice is traditionally believed to help. Frame this as a spiritual and
wellness practice for balance and clarity - never as a medical treatment or guaranteed cure. If
the concern sounds like a serious health or mental health matter, gently note that this practice
complements, not replaces, appropriate professional care. Keep the whole response to 150-220
words.`;

export interface RemedyInput {
  concern: string;
  name?: string;
}

export async function generateRemedy(input: RemedyInput) {
  const prompt = `A user is asking for a remedy for this concern: "${input.concern}"
${input.name ? `Their name: ${input.name}` : ""}

Recommend a specific mantra or practice from Hindu scripture suited to this concern, with
instructions for practicing it.`;

  return generateAIResponse({
    system: REMEDY_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 500,
  });
}

const TAROT_SYSTEM = `You are Astro's tarot reader, deeply versed in the traditional 78-card deck
and its established meanings (upright and reversed). A user has drawn specific cards, in order,
optionally with a question in mind. Give a confident, specific, emotionally resonant reading:
address each card in the order drawn (name the position - e.g. past/present/future for a 3-card
draw), explain its traditional meaning, and weave the cards together into one coherent overall
message rather than three disconnected blurbs. Write in warm, vivid, second-person language. Keep
it to 200-300 words.`;

export interface TarotInput {
  cards: string[];
  question?: string;
  name?: string;
}

export async function generateTarotReading(input: TarotInput) {
  const prompt = `Cards drawn, in order: ${input.cards.join(", ")}
${input.question ? `The user's question: "${input.question}"` : "The user didn't specify a question - give a general life reading."}
${input.name ? `Their name: ${input.name}` : ""}

Give the tarot reading for these cards.`;

  return generateAIResponse({
    system: TAROT_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 600,
  });
}

const KUNDLI_SYSTEM = `You are Astro's senior Vedic astrologer, expert in Kundli (birth chart)
reading. Given a person's name, date of birth, and optionally their time and place of birth, write
a confident, specific Kundli-style reading: their likely ascendant/moon-sign energy, key planetary
themes (career, relationships, health, wealth), personality traits, and life direction. If time or
place of birth is missing, work from date alone and don't dwell on the gap - just give the fullest
reading you can. Write in warm, vivid, second-person language, organized in short paragraphs with
clear headers (e.g. Personality, Career, Relationships, Life Path). Keep it to 280-380 words.`;

export interface KundliInput {
  name: string;
  dob: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
}

export async function generateKundliReading(input: KundliInput) {
  const prompt = `Name: ${input.name}
Date of birth: ${input.dob}
${input.timeOfBirth ? `Time of birth: ${input.timeOfBirth}` : "Time of birth: not provided"}
${input.placeOfBirth ? `Place of birth: ${input.placeOfBirth}` : "Place of birth: not provided"}

Give this person's Kundli reading.`;

  return generateAIResponse({
    system: KUNDLI_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 900,
  });
}

const KUNDLI_MATCH_SYSTEM = `You are Astro's senior Vedic astrologer, expert in Kundli matching
(Guna Milan) for marriage/relationship compatibility. Given two people's names and dates of birth,
plus their Guna Milan score out of 36 (already computed - use it as given, don't recalculate it),
write a confident, specific compatibility reading: what the score means, their likely strengths as
a pair, areas needing conscious effort, and overall guidance. Write in warm, balanced, second-person
language addressed to both of them. Keep it to 250-350 words.`;

export interface KundliMatchInput {
  person1Name: string;
  person1Dob: string;
  person2Name: string;
  person2Dob: string;
  score: number;
}

export async function generateKundliMatch(input: KundliMatchInput) {
  const prompt = `Person 1: ${input.person1Name}, born ${input.person1Dob}
Person 2: ${input.person2Name}, born ${input.person2Dob}
Guna Milan score: ${input.score} / 36

Give their compatibility reading.`;

  return generateAIResponse({
    system: KUNDLI_MATCH_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 700,
  });
}

const PANCHANG_SYSTEM = `You are Astro's Vedic panchang expert. Write today's daily panchang - the
traditional Hindu almanac panel - covering: Tithi (lunar day), Nakshatra (lunar mansion), Yoga,
Karana, and a Shubh Muhurat (auspicious time window) for the day, plus one Rahu Kaal (inauspicious
window) to be mindful of. Present it as short labeled lines, not paragraphs, followed by one brief
2-3 sentence note on the day's overall energy. Since you don't have a live ephemeris, choose
plausible, traditionally-styled values confidently - never mention that you're estimating.`;

export async function generatePanchang(date: string) {
  const prompt = `Generate today's panchang for ${date}.`;
  return generateAIResponse({
    system: PANCHANG_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 400,
  });
}
