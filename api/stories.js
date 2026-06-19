export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda není povolena' });
  }

  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !notionDatabaseId) {
    return res.status(500).json({ error: 'Chybí Notion konfigurace na Vercelu.' });
  }

  try {
    // Dotaz do Notion databáze na seznam stránek
    const response = await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 20 // Načte posledních 20 příběhů
      })
    });

    if (!response.ok) throw new Error('Nepodařilo se načíst data z Notionu.');

    const data = await response.json();
    
    // Přeformátování dat pro náš frontend
    const stories = data.results.map(page => {
      const titleObj = page.properties.Name?.title;
      const title = titleObj && titleObj.length > 0 ? titleObj[0].plain_text : "Příběh bez názvu";
      const date = new Date(page.created_time).toLocaleDateString('cs-CZ');
      
      return {
        id: page.id,
        title: title,
        date: date,
        isNotionRef: true // Příznak, že text musíme případně načíst (nebo ho máme v Notionu)
      };
    });

    return res.status(200).json(stories);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
