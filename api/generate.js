export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není povolena' });
  }

  const { systemPrompt, userPrompt, inputDetails } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chybí OPENAI_API_KEY na Vercelu.' });
  }

  let rawResult = "";
  try {
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
        temperature: 0.85
      })
    });

    if (!openAiResponse.ok) {
      const errData = await openAiResponse.json();
      return res.status(openAiResponse.status).json({ error: errData.error?.message || 'Chyba OpenAI' });
    }

    const openAiData = await openAiResponse.json();
    rawResult = openAiData.choices[0].message.content;
  } catch (openAiError) {
    return res.status(500).json({ error: `Selhalo spojené s OpenAI: ${openAiError.message}` });
  }

  const titleMatch = rawResult.match(/\[NAZEV\]\s*(.*)/i);
  const textMatch = rawResult.match(/\[TEXT\]\s*([\s\S]*)/i);
  const title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
  let text = textMatch ? textMatch[1].trim() : rawResult;
  text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();

  let notionStatus = "Nenastaveno";
  let notionErrorDetails = null;

  if (notionToken && notionDatabaseId) {
    try {
      const paragraphs = text.split('\n').filter(p => p.trim() !== '');
      
      // Tělo stránky bude čisté, bez ošklivého zadání
      const notionChildren = paragraphs.map(p => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: p.slice(0, 2000) } }]
        }
      }));

      const notionResponse = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: notionDatabaseId },
          // UKLÁDÁNÍ DO SAMOSTATNÝCH SLOUPCŮ
          properties: {
            "Name": {
              "title": [{ "text": { "content": title } }]
            },
            "Hrdina": {
              "rich_text": [{ "text": { "content": inputDetails.heroName || "" } }]
            },
            "Věk": {
              "rich_text": [{ "text": { "content": inputDetails.age || "" } }]
            },
            "Atmosféra": {
              "rich_text": [{ "text": { "content": inputDetails.tension || "" } }]
            },
            "Délka": {
              "rich_text": [{ "text": { "content": inputDetails.length || "" } }]
            },
            "Téma": {
              "rich_text": [{ "text": { "content": inputDetails.theme || "" } }]
            }
          },
          children: notionChildren
        })
      });

      if (notionResponse.ok) {
        notionStatus = "Uspěšně uloženo";
      } else {
        const notionErrData = await notionResponse.json();
        notionStatus = "Chyba Notion API";
        notionErrorDetails = notionErrData.message || "Zkontroluj názvy sloupců v Notionu.";
      }
    } catch (notionErr) {
      notionStatus = "Chyba sítě Notion";
      notionErrorDetails = notionErr.message;
    }
  }

  return res.status(200).json({ title, text, notionStatus, notionErrorDetails });
}
