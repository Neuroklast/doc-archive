/**
 * Conservative, local rules. A suggestion is never an automatic move or upload.
 * No AI request, network call or sensitive document content is sent elsewhere.
 */
const RULES = [
  { folder: "Behörden", words: ["bescheid", "stadtverwaltung", "bürgeramt", "ausländerbehörde", "einwohnermeldeamt", "finanzamt", "gemeinde", "rentenbescheid"] },
  { folder: "Versicherungen", words: ["versicherungsschein", "versicherungsnummer", "versicherungsbeitrag", "police", "haftpflicht", "hausratversicherung", "rechtsschutz", "versicherer"] },
  { folder: "Finanzen", words: ["kontoauszug", "rechnung", "zahlungserinnerung", "mahnung", "überweisung", "sparkasse", "bankverbindung", "kreditkarte", "steuererklärung"] },
  { folder: "Verträge", words: ["mietvertrag", "arbeitsvertrag", "vertragsverlängerung", "vertrag", "abo-bestätigung", "kündigungsbestätigung"] },
  { folder: "Gesundheit", words: ["arztbrief", "befund", "laborbericht", "diagnose", "rezept", "krankenhaus", "krankenkasse", "medizinisch", "therapiebericht"] },
] as const;

function normalize(text: string) {
  return text.toLocaleLowerCase("de-DE").normalize("NFKC");
}

export function suggestFolder(
  title: string,
  sender: string,
  ocrText: string,
  availableFolders: readonly { id: string; name: string }[],
): { id: string; name: string; score: number } | null {
  const sources = [
    { value: normalize(title.slice(0, 180)), weight: 4 },
    { value: normalize(sender.slice(0, 180)), weight: 3 },
    { value: normalize(ocrText.slice(0, 12000)), weight: 1 },
  ];
  const results = RULES.map(rule => {
    const target = availableFolders.find(item => normalize(item.name) === normalize(rule.folder));
    if (!target) return null;
    const score = sources.reduce((sum, source) =>
      sum + (rule.words.some(term => source.value.includes(term)) ? source.weight : 0), 0);
    return { id: target.id, name: target.name, score };
  }).filter((item): item is { id: string; name: string; score: number } => item !== null);
  results.sort((a, b) => b.score - a.score);
  // Avoid guessing when evidence is weak or conflicting.
  return results[0]?.score >= 3 && results[0].score > (results[1]?.score ?? 0)
    ? results[0] : null;
}
