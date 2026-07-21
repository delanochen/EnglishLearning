import { createHash } from "node:crypto";
import type { CefrLevel } from "@prisma/client";
import type { SupportedGenerationType } from "./generator";

const levels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const unsafePatterns: Array<[string, RegExp]> = [
  ["SCRIPT_INJECTION", /<\s*script\b|javascript:|onerror\s*=/i],
  ["HTML_CONTENT", /<\/?[a-z][^>]*>/i],
  ["API_KEY_EXPOSURE", /(?:sk-[a-z0-9_-]{20,}|api[_ -]?key\s*[:=]\s*[a-z0-9_-]{16,})/i],
  ["PERSONAL_DATA", /\b\d{3}[-. ]?\d{2}[-. ]?\d{4}\b|\b(?:\d[ -]*?){13,19}\b/],
  ["ADVERTISING", /\b(?:buy now|limited-time offer|sponsored by|click here to purchase)\b/i],
  ["UNSAFE_CONTENT", /\b(?:graphic sex|suicide instructions|build a bomb|racial extermination)\b/i],
];

export type RuleQualityResult = {
  score: number;
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean | number | string>;
  ruleBasedLevel: CefrLevel;
  normalizedText: string;
  normalizedHash: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeContentText(value: unknown) {
  const stable = (input: unknown): unknown => Array.isArray(input) ? input.map(stable) : input && typeof input === "object"
    ? Object.fromEntries(Object.entries(input as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)])) : input;
  return JSON.stringify(stable(value))
    .normalize("NFKC").toLowerCase().replace(/<[^>]*>/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function contentHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function words(text: string) { return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []; }
function sentences(text: string) { return text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean); }
function syllables(word: string) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "").replace(/(?:es|ed|e)$/, "");
  return Math.max(1, cleaned.match(/[aeiouy]+/g)?.length ?? 1);
}

export function readingMetrics(text: string) {
  const tokens = words(text); const lines = sentences(text); const syllableCount = tokens.reduce((sum, word) => sum + syllables(word), 0);
  const averageSentenceLength = tokens.length / Math.max(1, lines.length);
  const readingEase = 206.835 - 1.015 * averageSentenceLength - 84.6 * (syllableCount / Math.max(1, tokens.length));
  const grade = 0.39 * averageSentenceLength + 11.8 * (syllableCount / Math.max(1, tokens.length)) - 15.59;
  return { wordCount: tokens.length, sentenceCount: lines.length, averageSentenceLength, readingEase, grade };
}

export function levelFromGrade(grade: number): CefrLevel {
  if (grade <= 1) return "PRE_A1"; if (grade <= 3) return "A1"; if (grade <= 5) return "A2";
  if (grade <= 7) return "B1"; if (grade <= 9) return "B2"; if (grade <= 12) return "C1"; return "C2";
}

function questionIssues(root: Record<string, unknown>) {
  const questions = [root.questions, root.exercises].find(Array.isArray) as unknown[] | undefined;
  if (!questions) return [];
  const issues: string[] = []; const prompts = new Set<string>();
  for (const raw of questions) {
    const question = record(raw); const prompt = String(question.prompt ?? "").trim().toLowerCase();
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    if (prompt && prompts.has(prompt)) issues.push("DUPLICATE_QUESTION");
    prompts.add(prompt);
    if (options.length && !options.includes(String(question.answerKey ?? ""))) issues.push("INVALID_ANSWER_KEY");
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) issues.push("DUPLICATE_OPTIONS");
    const answer = String(question.answerKey ?? "").trim().toLowerCase();
    if (answer.length >= 4 && prompt.includes(answer)) issues.push("ANSWER_LEAKED_IN_PROMPT");
  }
  return [...new Set(issues)];
}

function estimateLevel(type: SupportedGenerationType, root: Record<string, unknown>, text: string): CefrLevel {
  if (type === "READING_GENERATION") return levelFromGrade(readingMetrics(String(root.body ?? text)).grade);
  if (type === "VOCABULARY_GENERATION") {
    const word = String(root.word ?? ""); let index = word.length <= 4 ? 1 : word.length <= 7 ? 2 : word.length <= 10 ? 3 : 4;
    if (/(?:tion|sion|ment|ology|phobia|ization)$/.test(word.toLowerCase())) index += 1;
    return levels[Math.min(levels.length - 1, index)];
  }
  const metrics = readingMetrics(text); return levelFromGrade(metrics.grade);
}

export function inspectGeneratedContent(type: SupportedGenerationType, output: unknown): RuleQualityResult {
  const root = record(output); const rawText = JSON.stringify(output); const normalizedText = normalizeContentText(output);
  const errors = unsafePatterns.filter(([, pattern]) => pattern.test(rawText)).map(([code]) => code);
  errors.push(...questionIssues(root));
  const warnings: string[] = [];
  if (!/[\u3400-\u9fff]/u.test(rawText)) warnings.push("MISSING_CHINESE_SUPPORT");
  if (normalizedText.length < 80) errors.push("CONTENT_TOO_SHORT");
  const metrics = readingMetrics([root.body, root.ruleEn, root.intro, root.definitionEn, rawText].filter(Boolean).join(" "));
  if (type === "READING_GENERATION" && metrics.wordCount < 80) warnings.push("READING_TOO_SHORT");
  const uniqueErrors = [...new Set(errors)]; const uniqueWarnings = [...new Set(warnings)];
  const score = Math.max(0, 100 - uniqueErrors.length * 25 - uniqueWarnings.length * 7);
  return {
    score, errors: uniqueErrors, warnings: uniqueWarnings,
    checks: { safe: !uniqueErrors.some((error) => unsafePatterns.some(([code]) => code === error)), validQuestions: !uniqueErrors.some((error) => error.includes("ANSWER") || error.includes("QUESTION") || error.includes("OPTIONS")), bilingual: !uniqueWarnings.includes("MISSING_CHINESE_SUPPORT"), wordCount: metrics.wordCount, readingEase: Number(metrics.readingEase.toFixed(2)), grade: Number(metrics.grade.toFixed(2)) },
    ruleBasedLevel: estimateLevel(type, root, rawText), normalizedText, normalizedHash: contentHash(normalizedText),
  };
}

export function levelDistance(left: CefrLevel, right: CefrLevel) {
  return Math.abs(levels.indexOf(left) - levels.indexOf(right));
}

export function ngramSimilarity(left: string, right: string, size = 3) {
  const grams = (text: string) => new Set(Array.from({ length: Math.max(0, text.length - size + 1) }, (_, index) => text.slice(index, index + size)));
  const a = grams(left); const b = grams(right); if (!a.size || !b.size) return left === right ? 1 : 0;
  let intersection = 0; for (const item of a) if (b.has(item)) intersection++;
  return intersection / (a.size + b.size - intersection);
}
