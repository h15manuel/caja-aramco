export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!q) return true;
  
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!q) return 0;
  
  // Exact substring match scores highest
  if (t.includes(q)) return 100;
  
  // Starts with
  if (t.startsWith(q)) return 90;
  
  let score = 0;
  let qi = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      if (lastMatch === ti - 1) score += 5; // consecutive bonus
      lastMatch = ti;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}
