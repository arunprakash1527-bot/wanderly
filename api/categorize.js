const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, categories, mode } = req.body;

  if (!content && mode !== 'batch') {
    return res.status(400).json({ error: 'content is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const categoryList = (categories || []).map(c => c.name).join(', ');

    if (mode === 'batch') {
      const { notes } = req.body;
      if (!notes || !notes.length) {
        return res.status(400).json({ error: 'notes array is required for batch mode' });
      }

      const notesText = notes.map((n, i) => `[${i}] ${n.content}`).join('\n');

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You categorize notes. For each note below, suggest a category and priority (1=urgent, 2=normal, 3=low).

Existing categories: ${categoryList || 'none yet — suggest new ones'}

Notes:
${notesText}

Respond with ONLY a JSON array. Each element: {"index": <number>, "category": "<name>", "priority": <1|2|3>, "isNew": <true if category doesn't exist yet>}
No markdown, no explanation.`
        }]
      });

      const text = response.content[0].text.trim();
      const suggestions = JSON.parse(text);
      return res.status(200).json({ suggestions });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You categorize notes. Given this note, suggest one category and a priority level.

Existing categories: ${categoryList || 'none yet — suggest a new one'}

Note: "${content}"

Respond with ONLY a JSON object: {"category": "<name>", "priority": <1|2|3>, "isNew": <true if suggesting a new category>}
Priority: 1=urgent/time-sensitive, 2=normal, 3=low/someday.
No markdown, no explanation.`
      }]
    });

    const text = response.content[0].text.trim();
    const suggestion = JSON.parse(text);
    return res.status(200).json(suggestion);

  } catch (err) {
    console.error('Categorize error:', err);
    return res.status(500).json({ error: 'Failed to categorize' });
  }
};
