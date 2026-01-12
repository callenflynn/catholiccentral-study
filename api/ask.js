export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, subject, pageText } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Missing question' });
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

    if (!contextText.trim()) {
      contextText = 'No study material available for this topic.';
    }

    if (contextText.length > 6000) {
      contextText = contextText.slice(0, 6000);
    }

    const prompt = `
You are a study assistant for Detroit Catholic Central students.

Rules:
- Use ONLY the provided study materials.
- If the answer is not there, say: "I don’t have that in my notes."
- Do not guess.
- Be clear and student-friendly.

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
        error: 'HF returned non-JSON',
        raw: raw.slice(0, 300),
      });
    }

    if (data?.error) {
      return res.status(503).json({
        answer: 'The AI is warming up. Try again in about 30 seconds.',
      });
    }

    let rawAnswer = '';

    if (Array.isArray(data)) {
      if (data[0]?.generated_text) {
        rawAnswer = data[0].generated_text;
      } else if (data[0]?.tokens) {
        rawAnswer = data[0].tokens.map(t => t.text).join('');
      }
    }

    if (!rawAnswer) {
      console.error('HF response:', JSON.stringify(data));
      return res.status(200).json({
        answer: 'The AI failed to generate an answer. Try again.',
      });
    }

    let answer = rawAnswer;

    if (answer.includes('Answer:')) {
      answer = answer.split('Answer:').pop();
    }

    if (answer.includes('Study materials:')) {
      answer = answer.split('Study materials:').pop();
    }

    answer = answer.trim();

    if (!answer) {
      answer = 'I don’t have that in my notes.';
    }

    res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
}



async function getSubjectContent(req, subject) {
  const host = req.headers.host ? `https://${req.headers.host}` : null;
  if (!host) return [];

  const urls = !subject || subject === 'all'
    ? await getAllUrlsFromSitemap(host)
    : await getSubjectUrlsFromSitemap(host, subject);

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
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function scoreChunk(text, question) {
  const qWords = question.toLowerCase().split(/\W+/);
  const t = text.toLowerCase();
  return qWords.filter(w => w.length > 2 && t.includes(w)).length;
}

async function aggregateUrls(urls) {
  if (!urls || !urls.length) return [];

  const chunks = [];

  for (const url of urls.slice(0, 30)) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const html = await resp.text();
      const text = htmlToText(html);
      if (!text) continue;

      for (const c of chunkText(text)) {
        chunks.push({ url, text: c });
      }
    } catch {}
  }

  return chunks;
}



function htmlToText(html) {
  try {
    let h = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

    const match = h.match(/<div[^>]*class=["'][^"']*study-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (match && match[1]) h = match[1];

    return h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}



function subjectPatterns(subject) {
  switch (subject) {
    case 'christology': return ['/christology/'];
    case 'biology': return ['/biology/', '/biology.html'];
    case 'freshman-english': return ['/freshman-english/', '/freshman-english.html', '/smith-english.html'];
    case 'freshman-revelations': return ['/freshman-revelations/', '/freshman-revelations.html'];
    case 'ajof': return ['/ajof/', '/aerospace-journey-of-flight', '/aerospace-chapter-'];
    case 'history': return ['/history/', '/history.html'];
    default: return [`/${subject}/`, `/${subject}.html`];
  }
}
