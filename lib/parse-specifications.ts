export interface ParsedSpecification {
  key: string;
  value: string;
}

/**
 * Parses a block of pasted specification text into structured key/value pairs.
 *
 * It is designed to handle real-world spec sheets (e.g. copied from a
 * datasheet or a website table) which commonly look like:
 *
 *   Camera
 *   Image Sensor\t1/3 inch Progressive Scan CMOS
 *   Max. Resolution\t2560 × 1440
 *   Lens
 *   Focal Length & FOV\t2.8 mm, horizontal FOV 98°
 *   4 mm, horizontal FOV 78°
 *
 * Rules:
 *  - A line with a TAB (or 2+ spaces) between a label and a value is split
 *    into { key, value }. Tab is preferred; the 2+ space fallback only applies
 *    when the left-hand side has no digits (labels rarely contain digits,
 *    values usually do), which avoids mis-splitting value lines like
 *    "50 Hz: 20 fps".
 *  - A plain line (no separator) that looks like a value continuation
 *    (contains digits, or starts lowercase, or starts with common value
 *    tokens) is appended to the previous spec's value. This joins multi-line
 *    values such as DORI ranges or "Rotate mode, ... white / balance ...".
 *  - Any other plain line starts a new key (with an empty value). Section
 *    headers like "Camera" / "Lens" end up with empty values and are removed
 *    at the end, while multi-line-value keys like "Main Stream" / "Power"
 *    keep the value lines that follow them.
 */
export function parseSpecifications(input: string): ParsedSpecification[] {
  if (!input || !input.trim()) return [];

  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const specs: ParsedSpecification[] = [];
  let last: ParsedSpecification | null = null;

  const looksLikeContinuation = (line: string): boolean => {
    if (/\d/.test(line)) return true; // has a number → likely a value
    if (/^[a-z]/.test(line)) return true; // starts lowercase → wrapped value
    // common value-ish leading tokens / symbols
    if (/^(up to|approx\.?|max\.?|min\.?|yes|no|n\/a|[≥≤±·•\-–—])/i.test(line))
      return true;
    return false;
  };

  const splitKeyValue = (raw: string): [string, string] | null => {
    // 1) Prefer an explicit tab separator.
    const tabIdx = raw.indexOf("\t");
    if (tabIdx !== -1) {
      const key = raw.slice(0, tabIdx).trim();
      const value = raw.slice(tabIdx + 1).trim();
      if (key) return [key, value];
    }

    // 2) Fallback: 2+ spaces, but only when the label part has no digits.
    const m = raw.match(/^(\D+?)\s{2,}(.+)$/);
    if (m) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (key && value) return [key, value];
    }

    return null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue; // skip blank lines

    const kv = splitKeyValue(raw);
    if (kv) {
      const spec: ParsedSpecification = { key: kv[0], value: kv[1] };
      specs.push(spec);
      last = spec;
      continue;
    }

    // No separator on this line.
    if (last && !last.value && looksLikeContinuation(line)) {
      // First value line for a pending key (e.g. "Power" then "12 VDC ...").
      last.value = line;
    } else if (last && last.value && looksLikeContinuation(line)) {
      // Additional wrapped value line → append.
      last.value += " " + line;
    } else {
      // Treat as a new key (section header or multi-line-value key).
      const spec: ParsedSpecification = { key: line, value: "" };
      specs.push(spec);
      last = spec;
    }
  }

  // Drop leftover section headers (keys that never received a value) and
  // normalise whitespace inside values.
  return specs
    .map((s) => ({ key: s.key.trim(), value: s.value.replace(/\s+/g, " ").trim() }))
    .filter((s) => s.key && s.value);
}
