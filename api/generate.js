export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není povolena' });
  }

  const { systemPrompt, userPrompt, inputDetails, passcode } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;
  const notionMembersDbId = process.env.NOTION_MEMBERS_DATABASE_ID;

  if (!passcode) {
    return res.status(401).json({ error: '🔒 Přístup odmítnut. Pro generování pohádek musíte nejprve zadat Váš Premium kód.' });
  }

  // 1. KONTROLA: Jedná se o první pohádku zdarma?
  const isFreeTrial = passcode.trim() === 'SL-FREE-TRIAL';

  // Pokud to NENÍ free trial, musíme kód standardně ověřit v Notionu
  if (!isFreeTrial) {
    try {
      const checkMemberRes = await fetch(`https://api.notion.com/v1/databases/${notionMembersDbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: "Unikátní kód",
            rich_text: { equals: passcode.trim() }
          }
        })
      });

      if (!checkMemberRes.ok) throw new Error('Nepodařilo se navázat spojení s databází členů.');
      const memberData = await checkMemberRes.json();
      
      if (memberData.results.length === 0) {
        return res.status(403).json({ error: '🔒 Tento kód v naší Noční Knihovně neexistuje. Zkontrolujte prosím překlepy nebo si aktivujte členství.' });
      }

      const isRecordActive = memberData.results[0].properties.Aktivní.checkbox;
      if (!isRecordActive) {
        return res.status(403).json({ error: '🔒 Vaše Premium členství vypršelo. Obnovte si prosím platbu přes Stripe.' });
      }
    } catch (authError) {
      return res.status(500).json({ error: `Chyba autorizace brány: ${authError.message}` });
    }
  }

  // 2. PROCES S OPENAI (Společný pro platící i pro 1 free pokus)
  if (!apiKey) return res.status(500).json({ error: 'Chybí OPENAI_API_KEY.' });

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.8
      })
    });

    const openAiData = await openAiResponse.json();
    const rawResult = openAiData.choices[0].message.content;

    const titleMatch = rawResult.match(/\[NAZEV\]\s*(.*)/i);
    const textMatch = rawResult.match(/\[TEXT\]\s*([\s\S]*)/i);
    const title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
    let text = textMatch ? textMatch[1].trim() : rawResult;
    text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();

    // Uložení pohádky do tvojí Notion kroniky (zapisujeme i free trial pohádky, ať o ně nepřijdeme)
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
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
          "Name": { "title": [{ "text": { "content": title } }] },
          "Hrdina": { "rich_text": [{ "text": { "content": (inputDetails.heroName || "") + (isFreeTrial ? " (Zkouška zdarma)" : "") } }] },
          "Věk": { "rich_text": [{ "text": { "content": inputDetails.age || "" } }] },
          "Atmosféra": { "rich_text": [{ "text": { "content": inputDetails.tension || "" } }] },
          "Délka": { "rich_text": [{ "text": { "content": inputDetails.length || "" } }] },
          "Téma": { "rich_text": [{ "text": { "content": inputDetails.theme || "" } }] }
        },
        children: paragraphs.map(p => ({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: p.slice(0, 2000) } }] }
        }))
      })
    });

    return res.status(200).json({ title, text, notionStatus: "Uspěšně uloženo" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
