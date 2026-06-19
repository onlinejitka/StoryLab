export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metoda není povolena' });
  }

  const { id } = req.query;
  const notionToken = process.env.NOTION_TOKEN;

  if (!id) {
    return res.status(400).json({ error: 'Chybí ID příběhu.' });
  }

  try {
    // 1. NAČTEME STRÁNKU PRO OVĚŘENÍ NÁZVU
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    if (!pageRes.ok) throw new Error('Nepodařilo se načíst detaily příběhu.');
    const pageData = await pageRes.json();
    
    const titleObj = pageData.properties?.Name?.title;
    const title = titleObj && titleObj.length > 0 ? titleObj[0].plain_text : "Kouzelný příběh";

    // 2. STÁHNEME VŠECHNY ODSTAVCE (BLOKY) UVNITŘ STRÁNKY
    const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!blocksRes.ok) throw new Error('Nepodařilo se načíst obsah textu.');
    const blocksData = await blocksRes.json();

    // Filtrujeme pouze textové odstavce a spojíme je zpět do jednoho celku
    const textParts = blocksData.results
      .filter(block => block.type === 'paragraph')
      .map(block => {
        const richText = block.paragraph?.rich_text;
        return richText && richText.length > 0 ? richText[0].plain_text : "";
      });

    const text = textParts.join('\n\n');

    return res.status(200).json({ title, text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
