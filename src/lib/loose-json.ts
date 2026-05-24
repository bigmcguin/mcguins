// Some upstream datasets are produced by Python's json.dumps with
// allow_nan=True, which emits NaN, Infinity, and -Infinity. These are not
// valid JSON and JSON.parse will reject the entire payload. This helper
// replaces those tokens with null before parsing so the importer can still
// consume the file. Replacement only matches the tokens as whole words to
// avoid mangling matching substrings inside string values.

export function parseLooseJson(text: string): unknown {
  const cleaned = text
    .replace(/(?<![A-Za-z0-9_])NaN(?![A-Za-z0-9_])/g, 'null')
    .replace(/(?<![A-Za-z0-9_])-Infinity(?![A-Za-z0-9_])/g, 'null')
    .replace(/(?<![A-Za-z0-9_])Infinity(?![A-Za-z0-9_])/g, 'null');
  return JSON.parse(cleaned);
}
