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
    // 1. GENEROVÁNÍ PŘÍBĚHU PŘES OPENAI
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
    rawResult = openAiData.choices[0].message.content;
  } catch (openAiError) {
    return res.status(500).json({ error: `Selhalo spojené s OpenAI: ${openAiError.message}` });
  }

  // Parser textu
  const titleMatch = rawResult.match(/\[NAZEV\]\s*(.*)/i);
  const textMatch = rawResult.match(/\[TEXT\]\s*([\s\S]*)/i);
  const title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
  let text = textMatch ? textMatch[1].trim() : rawResult;
  text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();

  // 2. POKUS O ULOŽENÍ DO NOTIONU (S GRACIÓZNÍM SELHÁNÍM)
  let notionStatus = "Nenastaveno";
  let notionErrorDetails = null;

  if (notionToken && notionDatabaseId) {
    try {
      const paragraphs = text.split('\n').filter(p => p.trim() !== '');
      
      // Vytvoření bloků pro Notion (nejprve přehledné zadání, pak text)
      const notionChildren = [
        {
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: [{ 
              text: { 
                content: `⚙️ ZADÁNÍ PRO AI:\n• Hrdina: ${inputDetails.heroName}\n• Věk: ${inputDetails.age}\n• Atmosféra: ${inputDetails.tension}\n• Délka: ${inputDetails.length}\n• Téma: ${inputDetails.theme}` 
              } 
            }]
          }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        },
        ...paragraphs.map(p => ({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: p.slice(0, 2000) } }]
          }
        }))
      ];

      const notionResponse = await fetch('https://api.notion.com/v1/pages', {
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

      if (notionResponse.ok) {
        notionStatus = "Uspěšně uloženo";
      } else {
        const notionErrData = await notionResponse.json();
        notionStatus = "Chyba Notion API";
        notionErrorDetails = notionErrData.message || "Neznámá chyba v tabulce Notion.";
      }
    } catch (notionErr) {
      notionStatus = "Chyba sítě Notion";
      notionErrorDetails = notionErr.message;
    }
  } else {
    notionStatus = "Chybí klíče";
    notionErrorDetails = "Na Vercelu nejsou vyplněné proměnné NOTION_TOKEN nebo NOTION_DATABASE_ID.";
  }

  // Vždy vrátíme příběh, i kdyby Notion spadl, a k tomu přibalíme info o stavu Notionu
  return res.status(200).json({ 
    title, 
    text, 
    notionStatus, 
    notionErrorDetails 
  });
}
