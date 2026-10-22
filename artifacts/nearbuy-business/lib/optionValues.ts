/** Split keyboard replays and pasted lists, without cumulative comma chips. */
export function optionValues(existing: string[], input = ""): string[] {
  const seen = new Set<string>();
  return [...existing, input].flatMap(value => value.split(/[,;\n]/))
    .map(value => value.trim()).filter(value => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function optionDraft(input: string): { complete: string[]; draft: string } {
  const parts = input.split(/[,;\n]/);
  const draft = parts.pop() ?? "";
  return { complete: optionValues(parts), draft };
}
