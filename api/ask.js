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

    const contextText = pageText || '';
    const prompt = `You are a tutor helping a student.\nSubject: ${subject || 'unknown'}\nHere is the study page:\n${contextText}\n\nAnswer the student’s question clearly and only based on this page:\n${question}`;

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
