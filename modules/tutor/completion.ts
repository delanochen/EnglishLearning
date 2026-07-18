export const TUTOR_REQUIRED_TURNS = 4;
export const TUTOR_REQUIRED_ENGLISH_WORDS = 12;

type TutorMessage = { role: string; content: string };

export function tutorPracticeProgress(messages: TutorMessage[]) {
  const learnerMessages = messages.filter((message) => message.role === "user");
  const englishWords = learnerMessages.reduce((total, message) => {
    return total + (message.content.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0);
  }, 0);
  const turns = learnerMessages.length;
  return {
    turns,
    englishWords,
    complete: turns >= TUTOR_REQUIRED_TURNS && englishWords >= TUTOR_REQUIRED_ENGLISH_WORDS,
  };
}
