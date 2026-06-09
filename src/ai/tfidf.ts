const STOP = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might',
  'it','its','this','that','these','those',
  'i','me','my','we','our','you','your','he','she','they','them',
  'what','which','who','when','where','why','how',
  'not','no','so','if','as','by','from','up','out','about','into',
  'than','then','just','can','s','t','re','ve','ll','d',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Score each doc against the query; returns array parallel to docs. */
export function rankByRelevance(query: string, docs: string[]): number[] {
  const N = docs.length;
  if (N === 0) return [];

  const qTokens    = tokenize(query);
  const dTokenized = docs.map(tokenize);

  // Document frequency per term
  const df = new Map<string, number>();
  for (const tokens of dTokenized) {
    for (const t of new Set(tokens)) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const idf = (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;

  const vocab = [...new Set([...qTokens, ...dTokenized.flat()])];

  function vec(tokens: string[]): number[] {
    const tf  = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const len = tokens.length || 1;
    return vocab.map((v) => ((tf.get(v) ?? 0) / len) * idf(v));
  }

  const qVec = vec(qTokens);
  return dTokenized.map((tokens) => cosine(qVec, vec(tokens)));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na  += a[i]! ** 2;
    nb  += b[i]! ** 2;
  }
  const denom = Math.sqrt(na * nb);
  return denom === 0 ? 0 : dot / denom;
}
