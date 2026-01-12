export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { question, subject, pageText } = req.body || {};
    if (!question) {
      res.status(400).json({ error: 'Missing question' });
      return;
    }

    const chunks = await getSubjectContent(req, subject);

    let contextText = pageText || '';
    if (chunks && chunks.length) {
      const ranked = chunks
        .map(c => ({ ...c, score: scoreChunk(c.text, question) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      contextText = ranked.map(c => c.text).join('\n\n');
    }

    const MAX_CHARS = 6000;
    if (contextText.length > MAX_CHARS) {
      contextText = contextText.slice(0, MAX_CHARS);
    }

    const prompt = `
You are a study assistant for Detroit Catholic Central students.

Rules:
- You MUST only use the provided study materials.
- If the answer is not in the materials, say: "I don’t have that in my notes."
- Do not guess or make things up.
- Be clear, helpful, and student-friendly.

Study materials:
${contextText}

Question:
${question}

Answer:
`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.2,
            top_p: 0.9,
            repetition_penalty: 1.1,
          },
        }),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: 'HuggingFace returned invalid JSON',
        raw: raw.slice(0, 300),
      });
    }

    let rawAnswer = '';

    if (Array.isArray(data)) {
      if (data[0]?.generated_text) {
        rawAnswer = data[0].generated_text;
      } else if (data[0]?.tokens) {
        rawAnswer = data[0].tokens.map(t => t.text).join('');
      }
    } else if (data?.generated_text) {
      rawAnswer = data.generated_text;
    } else if (data?.error) {
      return res.status(503).json({ 
        answer: `AI model is loading. This usually takes 20-30 seconds. Please try again in a moment.`
      });
    }

    if (!rawAnswer) {
      console.error('Empty rawAnswer. Full data:', JSON.stringify(data));
      return res.status(200).json({ 
        answer: 'The AI did not generate a response. Please try rephrasing your question or try again.'
      });
    }

    let answer = rawAnswer;
    if (answer.includes('Answer:')) {
      answer = answer.split('Answer:').pop().trim();
    } else if (answer.includes(question)) {
      answer = answer.split(question).pop().trim();
    }

    // If answer is still just the prompt, try to get everything after the last newline
    if (answer === rawAnswer && answer.includes('\n')) {
      const lines = answer.split('\n').filter(l => l.trim());
      answer = lines[lines.length - 1];
    }

    res.status(200).json({ answer: answer || 'No clear answer found. Please try rephrasing your question.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
}



async function getSubjectContent(req, subject) {
  const host = req.headers.host ? `https://${req.headers.host}` : null;
  if (!host) return [];

  let urls;
  if (!subject || subject === 'all') {
    urls = await getAllUrlsFromSitemap(host);
  } else {
    urls = await getSubjectUrlsFromSitemap(host, subject);
  }

  return await aggregateUrls(urls);
}

async function getAllUrlsFromSitemap(host) {
  try {
    const resp = await fetch(`${host}/sitemap.xml`);
    if (!resp.ok) return [];
    const xml = await resp.text();
    return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
  } catch {
    return [];
  }
}

async function getSubjectUrlsFromSitemap(host, subject) {
  try {
    const resp = await fetch(`${host}/sitemap.xml`);
    if (!resp.ok) return [];
    const xml = await resp.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);

    const patterns = subjectPatterns(subject);
    return locs.filter(u => patterns.some(p => u.includes(p)));
  } catch {
    return [];
  }
}



function chunkText(text, size = 800) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  return chunks;
}

function scoreChunk(text, question) {
  const qWords = question.toLowerCase().split(/\W+/);
  const t = text.toLowerCase();
  let score = 0;
  for (const w of qWords) {
    if (w.length > 2 && t.includes(w)) score++;
  }
  return score;
}

async function aggregateUrls(urls) {
  if (!urls || urls.length === 0) return [];

  const chunks = [];
  const capped = urls.slice(0, 30);

  for (const url of capped) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;

      const html = await resp.text();
      const text = htmlToText(html);
      if (!text) continue;

      const pageChunks = chunkText(text);
      for (const c of pageChunks) {
        chunks.push({ url, text: c });
      }
    } catch {}
  }

  return chunks;
}



function htmlToText(html) {
  try {
    let h = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    const match = h.match(
      /<div[^>]*class=["'][^"']*study-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    if (match && match[1]) h = match[1];

    return h
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return null;
  }
}



function subjectPatterns(subject) {
  switch (subject) {
    case 'christology':
      return ['/christology/'];
    case 'biology':
      return ['/biology/', '/biology.html'];
    case 'freshman-english':
      return ['/freshman-english/', '/freshman-english.html', '/smith-english.html'];
    case 'freshman-revelations':
      return ['/freshman-revelations/', '/freshman-revelations.html'];
    case 'ajof':
      return ['/ajof/', '/aerospace-journey-of-flight', '/aerospace-chapter-'];
    case 'history':
      return ['/history/', '/history.html'];
    default:
      return [`/${subject}/`, `/${subject}.html`];
  }
}
