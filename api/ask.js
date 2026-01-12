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
    const isAll = !subject || subject === 'all';
    const prompt = `You are a tutor helping a student.\nScope: ${isAll ? 'site-wide (all classes)' : `subject: ${subject}`}\nHere are the study materials:\n${contextText}\n\nAnswer the student’s question clearly and only based on these materials:\n${question}`;

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
  // If no subject or 'all', aggregate the entire site via sitemap
  if (!subject || subject === 'all') {
    const host = req.headers.host ? `https://${req.headers.host}` : null;
    const urls = await getAllUrlsFromSitemap(host);
    return await aggregateUrls(urls);
  }
  const host = req.headers.host ? `https://${req.headers.host}` : null;
  // Try using sitemap to include all pages for subject
  const texts = [];
  const urls = await getSubjectUrlsFromSitemap(host, subject);
  return await aggregateUrls(urls);
}
async function getAllUrlsFromSitemap(host) {
  if (!host) return null;
  try {
    const resp = await fetch(`${host}/sitemap.xml`);
    if (!resp.ok) return null;
    const xml = await resp.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
    return locs;
  } catch {
    return null;
  }
}

async function aggregateUrls(urls) {
  if (!urls || urls.length === 0) return null;
  const texts = [];
  // Limit to avoid overly large prompts; adjust as needed
  const capped = urls.slice(0, 30);
  for (const url of capped) {
    try {
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

async function getSubjectUrlsFromSitemap(host, subject) {
  if (!host) return null;
  try {
    const resp = await fetch(`${host}/sitemap.xml`);
    if (!resp.ok) return null;
    const xml = await resp.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
    const patterns = subjectPatterns(subject);
    const urls = locs.filter(u => patterns.some(p => u.includes(p)));
    return urls;
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
