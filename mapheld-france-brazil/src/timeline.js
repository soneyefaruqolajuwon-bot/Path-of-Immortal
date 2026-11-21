/* Script → timed caption chunks (2–4 words). Words wrapped in **…** render gold.
   A trailing "#tag" names a chunk so visuals can sync to the exact moment it appears. */
(function (root) {
  const DURATION = 70;

  const SEGMENTS = [
    { start: 0.25, end: 10, label: 'Hook', chunks: [
      'Ask anyone', 'which country shares', "France's longest", 'land border,',
      "and they'll probably guess #guess", 'Spain #spain', 'or Germany. #germany',
      'In reality, #reality', "it's **Brazil.** #brazil" ] },
    { start: 10, end: 24, label: 'The Reveal', chunks: [
      "France's border #fb", 'with Spain', 'in Europe', 'is about',
      '**387 miles** long. #m387', 'Meanwhile, #meanwhile', 'over **4,000 miles** #far', 'away',
      'in South America, #sa', 'France shares #shares', 'a **453-mile** border #m453', 'with Brazil. #withbrazil' ] },
    { start: 24, end: 40, label: 'How It Happened', chunks: [
      "That's because #because", 'of French Guiana #fg', 'a territory', "on South America's",
      'northern coast #coast', "that isn't a colony #colony", 'or a semi-independent #semi', 'territory.',
      'Legally, #legally', "it's a full", 'overseas department #dept', 'of France,', 'just like Paris. #paris' ] },
    { start: 40, end: 55, label: 'The Quirks', chunks: [
      'People living there #people', 'vote in French #vote', 'presidential elections,',
      'use the euro, #euro', 'and carry', 'French passports #passport', 'and because',
      'the European #esa', 'Space Agency', 'launches rockets #launch', 'from Kourou, #kourou',
      "it's literally", "Europe's gateway #gateway", 'to space. #space' ] },
    { start: 55, end: 68.4, label: 'Closing Beat', chunks: [
      'So the next time #next', 'someone asks you', "what France's", 'biggest neighbor is, #biggest',
      'the answer #answer', "isn't in Europe #notEurope", 'at all', "it's deep #deep",
      'in the Amazon #amazon', 'rainforest. #rainforest' ] }
  ];

  // Weight = words + pause for trailing punctuation; timed proportionally inside each segment.
  const chunks = []; const tags = {};
  for (const seg of SEGMENTS) {
    const parsed = seg.chunks.map(raw => {
      const m = raw.match(/^(.*?)(?:\s+#(\w+))?$/);
      const text = m[1];
      const words = text.replace(/\*\*/g, '').split(/\s+/).length;
      const pause = /[,.!?]$/.test(text) ? 0.7 : 0;
      return { text, tag: m[2], w: words + pause + 0.4 };
    });
    const total = parsed.reduce((a, c) => a + c.w, 0);
    let t = seg.start;
    const span = seg.end - seg.start;
    for (const c of parsed) {
      const dur = span * c.w / total;
      const chunk = { text: c.text, start: +t.toFixed(3), end: +(t + dur).toFixed(3), seg: seg.label };
      chunks.push(chunk);
      if (c.tag) tags[c.tag] = chunk;
      t += dur;
    }
  }

  root.TL = {
    DURATION, SEGMENTS, chunks,
    T: Object.fromEntries(Object.entries(tags).map(([k, c]) => [k, c.start])),
    E: Object.fromEntries(Object.entries(tags).map(([k, c]) => [k, c.end])),
    chunkAt: t => chunks.find(c => t >= c.start && t < c.end) || null
  };
})(typeof window !== 'undefined' ? window : globalThis);
