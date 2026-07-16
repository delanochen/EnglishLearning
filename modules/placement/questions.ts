export type PlacementQuestion = { id: string; section: string; prompt: string; options?: string[]; answerKey?: string; maxScore: number; passage?: string };
export const placementQuestions: PlacementQuestion[] = [
  { id: "vocab-1", section: "基础词汇", prompt: "Choose the word that means ‘预约’. ", options: ["appointment", "argument", "apartment"], answerKey: "appointment", maxScore: 1 },
  { id: "sentence-1", section: "句子理解", prompt: "What does ‘I have lived here for three years’ mean?", options: ["I moved away three years ago.", "I started living here three years ago and still live here.", "I will live here in three years."], answerKey: "I started living here three years ago and still live here.", maxScore: 1 },
  { id: "listening-1", section: "听力", prompt: "Listen and choose where the speaker is going.", passage: "I need to return these shoes because they are too small.", options: ["A store", "A hospital", "An airport"], answerKey: "A store", maxScore: 1 },
  { id: "reading-1", section: "阅读", prompt: "Why did Maya take the bus?", passage: "Maya usually walks to school, but this morning it was raining heavily, so she took the bus.", options: ["She was late.", "It was raining.", "She hurt her leg."], answerKey: "It was raining.", maxScore: 1 },
  { id: "grammar-1", section: "语法", prompt: "If I ___ more time, I would study another language.", options: ["have", "had", "will have"], answerKey: "had", maxScore: 1 },
  { id: "writing-1", section: "简单写作", prompt: "Write 3–5 English sentences about a goal you want to achieve.", maxScore: 2 },
  { id: "speaking-1", section: "口语（可选）", prompt: "Optional: use speech recognition or type what you would say when introducing yourself.", maxScore: 1 }
];
