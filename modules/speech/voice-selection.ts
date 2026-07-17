const femaleHints = ["female", "woman", "samantha", "victoria", "zira", "susan", "karen", "moira", "serena", "aria", "jenny"];
const maleHints = ["male", "man", "david", "mark", "daniel", "alex", "george", "guy", "ryan"];

export function selectPreferredVoiceName(voices: Array<{ name: string; default?: boolean }>, preference: "female" | "male" | "neutral") {
  if (!voices.length) return undefined;
  const hints = preference === "female" ? femaleHints : preference === "male" ? maleHints : [];
  return (hints.length ? voices.find((voice) => hints.some((hint) => voice.name.toLowerCase().includes(hint))) : undefined)?.name ?? voices.find((voice) => voice.default)?.name ?? voices[0].name;
}
