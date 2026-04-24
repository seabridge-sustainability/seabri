// TF-IDF cosine similarity for small in-process corpora.
// No external deps — adequate for the ~10-skill corpus.

export interface RankedItem {
  id: string
  score: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function buildIdf(docs: string[][]): Map<string, number> {
  const n = docs.length
  const df = new Map<string, number>()
  for (const doc of docs) {
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) ?? 0) + 1)
    }
  }
  const idf = new Map<string, number>()
  for (const [term, count] of df) {
    // Smoothed IDF: log(1 + N/df) avoids zero-division and softens common terms
    idf.set(term, Math.log(1 + n / count))
  }
  return idf
}

function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const n = tokens.length
  const vec = new Map<string, number>()
  for (const [term, count] of tf) {
    const idfVal = idf.get(term) ?? 0
    if (idfVal > 0) vec.set(term, (count / n) * idfVal)
  }
  return vec
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  for (const [term, aVal] of a) {
    const bVal = b.get(term)
    if (bVal !== undefined) dot += aVal * bVal
  }
  const mag = (v: Map<string, number>) =>
    Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0))
  const ma = mag(a)
  const mb = mag(b)
  return ma === 0 || mb === 0 ? 0 : dot / (ma * mb)
}

/**
 * Rank corpus items by TF-IDF cosine similarity to the query.
 * Returns items sorted descending by score. Items with score 0 are included
 * (callers should filter by score > 0 if they want only matched results).
 */
export function rankByTfIdf(
  query: string,
  corpus: Array<{ id: string; text: string }>
): RankedItem[] {
  if (corpus.length === 0) return []

  const tokenizedDocs = corpus.map((doc) => tokenize(doc.text))
  const idf = buildIdf(tokenizedDocs)

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return corpus.map((doc) => ({ id: doc.id, score: 0 }))

  const queryVec = tfidfVector(queryTokens, idf)

  return corpus
    .map((doc, i) => ({
      id: doc.id,
      score: cosineSimilarity(queryVec, tfidfVector(tokenizedDocs[i], idf)),
    }))
    .sort((a, b) => b.score - a.score)
}
