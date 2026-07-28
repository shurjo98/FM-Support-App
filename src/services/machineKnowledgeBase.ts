import fs from "fs";
import path from "path";

// Two schemas exist across the manual JSON files depending on which batch
// generated them: older files use display/cause/severity, newer ones use a
// plain description. Both fields are optional so lookups work against either.
type ErrorEntry = {
  code: string;
  display?: string;
  cause?: string;
  description?: string;
  solution: string;
  severity?: string;
};

type AlarmEntry = {
  code: string;
  display?: string;
  cause?: string;
  description?: string;
  solution: string;
  severity?: string;
};

type ParameterEntry = {
  id: string;
  name: string;
  range?: string;
  default?: unknown;
  unit?: string;
  values?: Record<string, string>;
  note?: string;
};

// Same schema split as ErrorEntry/AlarmEntry above: older files use
// symptom/checks, newer ones use issue/cause/solution.
type TroubleshootingEntry = {
  symptom?: string;
  issue?: string;
  checks?: string[];
  cause?: string;
  solution?: string;
};

type MachineManual = {
  model: string;
  manufacturer: string;
  type: string;
  specs?: Record<string, unknown>;
  errorCodes: ErrorEntry[];
  alarmCodes: AlarmEntry[];
  parameters: ParameterEntry[];
  troubleshooting: TroubleshootingEntry[];
};

// Strips everything but letters/digits so model codes compare equal
// regardless of hyphens/spaces/case (e.g. customer-typed "a5ebnx" vs the
// manual's "A5E-B-NX").
function normalizeModelToken(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// A manual's `model` field is usually a single code ("A5E-B-NX") but is
// sometimes a slash-separated list of variants covered by one manual (e.g.
// "A6F-E / A6F-Q / A6F-PK") — split those out so each variant can be matched
// on its own instead of only the (meaningless, concatenated) whole string.
function modelVariants(model: string): string[] {
  return model
    .split(/[/,]/)
    .map((s) => normalizeModelToken(s))
    .filter(Boolean);
}

// Exact match only (after normalizing hyphens/case) — a prefix match like
// "A5E-B" vs "A5E-B-NX" would silently blend two different machine models'
// answers together, which is worse than not matching at all here.
function modelMatchesHint(model: string, hint: string): boolean {
  return modelVariants(model).includes(normalizeModelToken(hint));
}

// Finds the manual most likely referenced by free text, by looking for its
// model code (hyphen/case-insensitive) anywhere in the query. Picks the
// longest matching model code to avoid short codes (e.g. "A3") shadowing a
// more specific one mentioned in the same query.
//
// Matches within a single whitespace-delimited word, not across the whole
// query blob — normalizing "A6F Err-01" down to one string ("A6FERR01")
// would otherwise let "A6F" + "Err" glue together and spuriously match a
// same-prefixed model name like "A6F-E" that was never actually typed.
// Hyphens are stripped WITHIN a word (so "A6F-E" still normalizes to
// "A6FE" as one unit), just not across a real space.
export function detectModelHint(query: string): string | null {
  const db = loadDb();
  const words = query.split(/\s+/).map(normalizeModelToken).filter(Boolean);
  let best: string | null = null;
  let bestLen = 0;
  for (const manual of db) {
    for (const variant of modelVariants(manual.model)) {
      if (variant.length < 2) continue;
      if (variant.length > bestLen && words.some((w) => w.includes(variant))) {
        best = manual.model;
        bestLen = variant.length;
      }
    }
  }
  return best;
}

let _db: MachineManual[] | null = null;

function loadDb(): MachineManual[] {
  if (_db) return _db;

  const dir = path.join(process.cwd(), "data", "machine-manuals", "json");
  if (!fs.existsSync(dir)) return (_db = []);

  _db = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        const raw = fs.readFileSync(path.join(dir, f), "utf8");
        const manual = JSON.parse(raw) as MachineManual;
        // Some manuals were generated without every section (e.g. no alarm
        // codes) — normalize so downstream lookups can assume arrays exist.
        manual.errorCodes ??= [];
        manual.alarmCodes ??= [];
        manual.parameters ??= [];
        manual.troubleshooting ??= [];
        return [manual];
      } catch {
        return [];
      }
    });

  return _db;
}

export type KbMatch = {
  model: string;
  manufacturer: string;
  code: string;
  cause: string;
  solution: string;
  severity: string;
};

// Extracts all error/alarm code strings from a query (e.g. "Err-08", "E3", "ALR-2").
// "OF" (the power-off/motor-sleep code) is matched case-sensitively only —
// case-insensitive matching would treat the extremely common English word
// "of" (as in "type of needle", "batch of shirts") as this code, hijacking
// nearly every plain-English on-topic question into a wrong KB answer.
function extractCodes(query: string): string[] {
  const caseInsensitive = query.match(/\b(Err-\d+|E\d+|ALR-\d+|A-\d+|ERR-\d+|ArnUP|PauOFF|A-UP)\b/gi) ?? [];
  const ofCode = query.match(/\bOF\.?\b/g) ?? [];
  return [...new Set([...caseInsensitive, ...ofCode].map((m) => m.toUpperCase()))];
}

export function lookupErrorCode(query: string, modelHint?: string): KbMatch[] {
  const db = loadDb();
  const codes = extractCodes(query);
  if (codes.length === 0) return [];

  const results: KbMatch[] = [];

  for (const manual of db) {
    if (modelHint && !modelMatchesHint(manual.model, modelHint)) {
      continue;
    }

    for (const code of codes) {
      const errMatch = manual.errorCodes.find(
        (e) => e.code.toUpperCase() === code || e.display?.toUpperCase() === code
      );
      if (errMatch) {
        results.push({
          model: manual.model,
          manufacturer: manual.manufacturer,
          code: errMatch.code,
          cause: errMatch.cause ?? errMatch.description ?? "",
          solution: errMatch.solution,
          severity: errMatch.severity ?? "unknown",
        });
      }

      const alarmMatch = manual.alarmCodes.find(
        (a) => a.code.toUpperCase() === code || a.display?.toUpperCase() === code
      );
      if (alarmMatch) {
        results.push({
          model: manual.model,
          manufacturer: manual.manufacturer,
          code: alarmMatch.code,
          cause: alarmMatch.cause ?? alarmMatch.description ?? "",
          solution: alarmMatch.solution,
          severity: alarmMatch.severity ?? "unknown",
        });
      }
    }
  }

  return results;
}

export type TsMatch = {
  model: string;
  manufacturer: string;
  symptom: string;
  checks: string[];
};

// Common English function words plus generic domain filler ("machine",
// "problem"...) that show up in nearly every symptom description on either
// side and so carry no discriminating signal — without excluding these, two
// unrelated symptoms sharing only "machine" and "does" clear the >=2-word
// overlap threshold below and produce a wrong match.
const STOPWORDS = new Set([
  "does", "did", "doesn", "didn", "has", "have", "having", "with", "this",
  "that", "from", "will", "when", "what", "keep", "keeps", "keeping",
  "been", "were", "they", "your", "machine", "problem", "issue", "please",
  "help", "some", "even", "just", "very", "much", "than", "then", "also",
  "into", "onto", "about", "there", "their", "would", "could", "should",
  "again", "still", "after", "before",
]);

// Whole-word tokens only (a plain .includes() would let "model" match "mode").
function significantWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words.filter((w) => w.length > 3 && !STOPWORDS.has(w)));
}

export function lookupTroubleshooting(query: string, modelHint?: string): TsMatch[] {
  const db = loadDb();
  const queryWords = significantWords(query);

  const results: TsMatch[] = [];
  for (const manual of db) {
    if (modelHint && !modelMatchesHint(manual.model, modelHint)) {
      continue;
    }
    for (const ts of manual.troubleshooting) {
      const label = ts.symptom ?? ts.issue ?? "";
      if (!label) continue;
      const labelWords = significantWords(label);
      let overlap = 0;
      for (const w of labelWords) if (queryWords.has(w)) overlap++;
      // Require at least 2 shared significant words (or scoped to a single
      // known model, where 1 is enough) — a single incidental word match
      // between two unrelated manuals is not a reliable symptom match.
      if (overlap >= 2 || (modelHint && overlap >= 1)) {
        const checks = ts.checks ?? [ts.cause, ts.solution].filter((s): s is string => Boolean(s));
        results.push({ model: manual.model, manufacturer: manual.manufacturer, symptom: label, checks });
      }
    }
  }
  return results.slice(0, 3);
}

export type CodeListEntry = { code: string; description: string };

// Handles "show me the error codes of A4C" style queries — distinct from
// lookupErrorCode, which only matches when a *specific* code (e.g. "Err-01")
// is already present in the query text. Without this, asking for the whole
// table had no KB path at all and fell through to the general OpenAI call.
export function listAllCodes(modelHint: string): { model: string; manufacturer: string; codes: CodeListEntry[] } | null {
  const db = loadDb();
  const manual = db.find((m) => modelMatchesHint(m.model, modelHint));
  if (!manual) return null;

  const codes: CodeListEntry[] = [
    ...manual.errorCodes.map((e) => ({ code: e.code, description: e.cause ?? e.description ?? "" })),
    ...manual.alarmCodes.map((a) => ({ code: a.code, description: a.cause ?? a.description ?? "" })),
  ];
  if (codes.length === 0) return null;

  return { model: manual.model, manufacturer: manual.manufacturer, codes };
}

export function getManualByModel(modelHint: string): MachineManual | null {
  const db = loadDb();
  const mh = modelHint.toUpperCase();
  return (
    db.find(
      (m) => m.model.toUpperCase() === mh || m.model.toUpperCase().includes(mh) || mh.includes(m.model.toUpperCase())
    ) ?? null
  );
}
