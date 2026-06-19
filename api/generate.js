export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není povolena' });
  }

  const { systemPrompt, userPrompt } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !notionToken || !notionDatabaseId) {
    return res.status(500).json({ error: 'Chybí konfigurace API klíčů na Vercelu.' });
  }

  try {
    // 1. ZAVOLÁME OPENAI PRO VYGENEROVÁNÍ PŘÍBĚHU
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8
      })
    });

    if (!openAiResponse.ok) {
      const errData = await openAiResponse.json();
      return res.status(openAiResponse.status).json({ error: errData.error?.message || 'Chyba OpenAI' });
    }

    const openAiData = await openAiResponse.json();
    const rawResult = openAiData.choices[0].message.content;

    // Mini parser pro získání názvu a textu
    const titleMatch = rawResult.match(/\[NAZEV\]\s*(.*)/i);
    const textMatch = rawResult.match(/\[TEXT\]\s*([\s\S]*)/i);
    const title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
    let text = textMatch ? textMatch[1].trim() : rawResult;
    text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();

    // 2. AUTOMATICKY ROZSEKÁME TEXT NA ODSTAVCE PRO NOTION
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    const notionChildren = paragraphs.map(p => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: p.slice(0, 2000) } }]
      }
    }));

    // 3. ULOŽÍME PŘÍBĚH DO NOTION DATABÁZE
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: notionDatabaseId },
        properties: {
          "Name": {
            "title": [{ "text": { "content": title } }]
          }
        },
        children: notionChildren
      })
    });

    // Vrátíme výsledek do frontendu
    return res.status(200).json({ title, text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
