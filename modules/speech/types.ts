export type SpeechPreferences = { language: "en-US" | "en-GB"; rate: number; pitch: number; voice?: string; genderPreference?: "female" | "male" | "neutral"; cacheAudio: boolean; timeoutMs: number; autoStop: boolean; saveRecording: boolean };
export type RecognitionResult = { transcript: string; confidence?: number; durationSeconds?: number };
export interface SpeechService { recognize(audio: Uint8Array, preferences: SpeechPreferences): Promise<RecognitionResult>; synthesize(text: string, preferences: SpeechPreferences): Promise<{ audio: Uint8Array; mimeType: string }>; }
export const browserSpeechDefaults: SpeechPreferences = { language: "en-US", rate: 0.9, pitch: 1, genderPreference: "neutral", cacheAudio: false, timeoutMs: 60_000, autoStop: true, saveRecording: true };
