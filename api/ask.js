export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { question, pageText, subject } = req.body || {};
    if (!question) {
      res.status(400).json({ error: 'Missing question' });
      return;
    }

    // If a subject is provided, aggregate content across known pages for that subject; else use pageText
    const aggregated = await getSubjectContent(req, subject);
    const contextText = aggregated || pageText || '';
    const prompt = `You are a tutor helping a student.\nSubject: ${subject || 'unknown'}\nHere are study materials for this subject:\n${contextText}\n\nAnswer the student’s question clearly and only based on this subject:\n${question}`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300 } }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ error: 'HF API error', details: text });
      return;
    }

    const data = await response.json();
    const answer = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

    res.status(200).json({ answer: answer || 'No response' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
}

async function getSubjectContent(req, subject) {
  if (!subject) return null;
  const host = req.headers.host ? `https://${req.headers.host}` : null;
  const map = {
    christology: [
      '/christology/index.html',
      '/christology/blessed-trinity-reading-2.html',
      '/christology/blessed-trinity-reading-2-summary.html',
    ],
    biology: [
      '/biology/index.html',
      '/biology/ch6/index.html',
      '/biology/ch8/part1/photosynthesis/index.html',
    ],
    'freshman-english': [
      '/freshman-english/index.html',
    ],
    'freshman-revelations': [
      '/freshman-revelations/index.html',
      '/freshman-revelations/man-or-rabbit.html',
    ],
    ajof: [
      '/ajof/index.html',
      '/ajof/ch9/index.html',
    ],
    history: [],
  };
  const paths = map[subject];
  if (!paths || paths.length === 0) return null;
  const texts = [];
  for (const p of paths) {
    try {
      const url = host ? `${host}${p}` : p;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const html = await resp.text();
      const text = htmlToText(html);
      if (text) texts.push(text);
    } catch {}
  }
  return texts.length ? texts.join('\n\n') : null;
}

function htmlToText(html) {
  try {
    // remove scripts/styles
    let h = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    // keep study-content if available
    const match = h.match(/<div[^>]*class=["'][^"']*study-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (match && match[1]) h = match[1];
    // strip tags
    const text = h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    return text;
  } catch {
    return null;
  }
}
