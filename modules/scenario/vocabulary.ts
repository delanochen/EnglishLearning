export function uniqueScenarioVocabulary(
  primary: ReadonlyArray<ReadonlyArray<string>>,
  shared: ReadonlyArray<ReadonlyArray<string>>,
) {
  const seen = new Set<string>();
  const unique: Array<[string, string]> = [];
  for (const [word, meaning] of [...primary, ...shared]) {
    if (!word || !meaning) continue;
    const key = word.trim().toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push([word, meaning]);
  }
  return unique;
}
