import React, { useState, useEffect } from 'react';

export default function App() {
  // Formulářové stavy
  const [heroName, setHeroName] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-7');
  const [tension, setTension] = useState(3);
  const [theme, setTheme] = useState('');
  const [length, setLength] = useState('medium');

  // Systémové stavy
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState('');
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  
  // Audio stavy
  const [voiceGender, setVoiceGender] = useState('female');
  const [isPlaying, setIsPlaying] = useState(false);

  // Stavy pro Nastavení API (Ukládá se do prohlížeče)
  const [showSettings, setShowSettings] = useState(false);
  const [apiProvider, setApiProvider] = useState(() => localStorage.getItem('sl_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sl_apikey') || '');

  const loadingMessages = [
    "Kovám tvůj příběh v magické výhni...",
    "Míchám ingredience čisté fantazie...",
    "Trénuji draka, aby ti přinesl kapitoly...",
    "Ladím správný tón vyprávění...",
    "Učesávám českou gramatiku..."
  ];

  useEffect(() => {
    let interval;
    if (isLoading) {
      setCurrentLoadingText(loadingMessages[0]);
      let idx = 1;
      interval = setInterval(() => {
        setCurrentLoadingText(loadingMessages[idx % loadingMessages.length]);
        idx++;
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Funkce pro uložení API klíče
  const saveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sl_provider', apiProvider);
    localStorage.setItem('sl_apikey', apiKey);
    setShowSettings(false);
  };

  // Pomocná funkce pro analýzu odpovědi od AI
  const parseAIResponse = (rawText) => {
    const titleMatch = rawText.match(/\[NAZEV\]\s*(.*)/i);
    const textMatch = rawText.match(/\[TEXT\]\s*([\s\S]*)/i);
    
    let title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
    let text = textMatch ? textMatch[1].trim() : rawText;
    
    // Vyčištění případných zbytků tagů
    text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();
    
    // Výběr ilustračního obrázku podle věku hrdiny
    let imageUrl = "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80"; // Les
    if (ageGroup === '2-4') imageUrl = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"; // Cute drak
    if (ageGroup === '8-12') imageUrl = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80"; // Meč/Hra
    if (ageGroup === '13+') imageUrl = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80"; // Sci-fi

    return { title, text, image: imageUrl };
  };

  // REÁLNÉ GENEROVÁNÍ PŘES AI
  const handleForgeStory = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      setShowSettings(true);
      setError("Před vykováním příběhu prosím vlož svůj API klíč v nastavení (ikona ozubeného kolečka).");
      return;
    }

    setIsLoading(true);
    setStory(null);
    setError(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);

    const ageLabels = { '2-4': '2-4 roky (Batole)', '5-7': '5-7 let (Předškolák)', '8-12': '8-12 let (Školák)', '13+': '13+ let (Mladý dospělý)' };
    const tensionLabels = { 1: 'Klidná usínací', 2: 'Pohodová', 3: 'Dobrodružná', 4: 'Napínavá', 5: 'Lehce strašidelná' };
    const lengthLabels = { short: 'krátký (3 minuty čtení)', medium: 'střední poctivý (10 minut čtení)', long: 'epický dlouhý (20+ minut čtení)' };

    const systemPrompt = `Jsi elitní spisovatel dětských knih a fantasy příběhů. Tvým úkolem je napsat originální, poutavý příběh v češtině na základě zadaných parametrů.
    CRITICAL GRAMMAR RULE: Podívej se na jméno hrdiny a zjisti/odhadni, zda se jedná o kluka nebo holku. Striktně tomu přizpůsob koncovky sloves v minulém čase (např. odešel vs. odešla). V textu nesmí být ŽÁDNÁ rodová lomítka (odešel/odešla) ani závorky. Příběh musí být plynulý, gramaticky dokonalý, laskavý a pohlcující.
    STRICT FORMATTING RULE: Tvůj výstup musí striktně dodržet formátování pomocí dvou značek takto:
    [NAZEV] Sem napiš originální název příběhu
    [TEXT] Sem napiš kompletní text příběhu rozdělený do čitelných odstavců.`;

    const userPrompt = `Parametry pro příběh:
    - Jméno hlavního hrdiny: ${heroName}
    - Věková kategorie: ${ageLabels[ageGroup]}
    - Úroveň napětí/atmosféra: ${tensionLabels[tension]}
    - Hlavní téma/zápletka/přání uživatele: ${theme || 'překonání nečekané výzvy a nalezení přátelství'}
    - Požadovaná délka: ${lengthLabels[length]}`;

    try {
      let rawResult = "";

      if (apiProvider === 'openai') {
        // Volání OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        
        if (!response.ok) throw new Error("Chyba OpenAI API. Zkontroluj platnost klíče a kredit.");
        const data = await response.json();
        rawResult = data.choices[0].message.content;

      } else {
        // Volání Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }]
          })
        });

        if (!response.ok) throw new Error("Chyba Google Gemini API. Zkontroluj platnost svého klíče.");
        const data = await response.json();
        rawResult = data.candidates[0].content.parts[0].text;
      }

      const processedStory = parseAIResponse(rawResult);
      setStory(processedStory);

    } catch (err) {
      setError(err.message || "Během generování příběhu se stala chyba.");
    } finally {
      setIsLoading(false);
    }
  };

  // Předčítání textu v prohlížeči
  const handlePlayAudio = () => {
    if (!story) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(story.title + ". " + story.text);
      utterance.lang = 'cs-CZ';
      const voices = window.speechSynthesis.getVoices();
      const czechVoices = voices.filter(v => v.lang.startsWith('cs'));

      if (czechVoices.length > 0) {
        const selectedVoice = czechVoices.find(v => {
          const name = v.name.toLowerCase();
          return voiceGender === 'female' 
            ? (name.includes('female') || name.includes('zdena') || name.includes('ivana'))
            : (name.includes('male') || name.includes('jakub'));
        }) || czechVoices[0];
        utterance.voice = selectedVoice;
      }

      utterance.rate = ageGroup === '2-4' ? 0.85 : 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tento prohlížeč bohužel nepodporuje syntézu řeči.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09070f] text-gray-100 font-sans antialiased p-4 md:p-8 selection:bg-emerald-500/30">
      
      {/* HLAVIČKA */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center border-b border-purple-950/40 pb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent">
            StoryLab
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-xs font-semibold">
            ŽIVÁ AI VERZE
          </div>
          {/* Tlačítko Nastavení */}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl bg-purple-950/40 border border-purple-900/40 text-purple-300 hover:text-emerald-400 hover:border-emerald-500/50 transition shadow"
            title="Nastavení API klíčů"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* MODÁLNÍ OKNO: NASTAVENÍ API */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#120e24] border border-purple-900/60 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">⚙️ Nastavení AI Mozku</h3>
            <p className="text-xs text-purple-300/80 leading-relaxed">
              Tento prototyp posílá dotazy přímo z tvého prohlížeče. Klíč se uloží pouze u tebe v počítači a nikdo jiný k němu nemá přístup.
            </p>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Poskytovatel AI</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" onClick={() => setApiProvider('gemini')}
                    className={`p-2.5 text-xs font-bold rounded-xl border transition ${apiProvider === 'gemini' ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-400'}`}
                  >
                    Google Gemini
                  </button>
                  <button 
                    type="button" onClick={() => setApiProvider('openai')}
                    className={`p-2.5 text-xs font-bold rounded-xl border transition ${apiProvider === 'openai' ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-400'}`}
                  >
                    OpenAI (GPT-4o)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Tvůj API klíč</label>
                <input 
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiProvider === 'openai' ? 'sk-or...' : 'AIzaSy...'}
                  className="w-full bg-[#191433] border border-purple-900/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 text-xs rounded-xl transition">
                  Uložit a zavřít
                </button>
                <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2.5 bg-purple-950/40 border border-purple-900/40 text-purple-300 font-bold text-xs rounded-xl hover:bg-purple-900/40 transition">
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HLAVNÍ OBSAH MŘÍŽKY */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEVÝ PANEL: KONFIGURACE */}
        <div className="lg:col-span-5 bg-[#120e24] border border-purple-950/40 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-emerald-400 tracking-wide">Kovárna Příběhů</h2>
          
          <form onSubmit={handleForgeStory} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Jméno hrdiny</label>
              <input
                type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)}
                placeholder="Např. Eliška, David, Kryštof..."
                className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Věk dobrodruha</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['2-4', 'Batolata', '2–4 roky'],
                  ['5-7', 'Předškoláci', '5–7 let'],
                  ['8-12', 'Školáci', '8–12 let'],
                  ['13+', 'Mladí dospělí', '13+ let']
                ].map(([id, label, sub]) => (
                  <button
                    key={id} type="button" onClick={() => setAgeGroup(id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${ageGroup === id ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-[#191433] border-purple-950 text-purple-300/60 hover:border-purple-900'}`}
                  >
                    <span className="font-bold text-sm">{label}</span>
                    <span className="text-[10px] text-purple-400/50 mt-0.5">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                <span>ÚROVEŇ NAPĚTÍ</span>
                <span className="text-amber-400 font-bold">
                  {tension === 1 && 'Usínací 🌟'}
                  {tension === 2 && 'Pohodová 🍃'}
                  {tension === 3 && 'Dobrodružná ⚔️'}
                  {tension === 4 && 'Napínavá 🔥'}
                  {tension === 5 && 'Strašidelná 👻'}
                </span>
              </div>
              <input
                type="range" min="1" max="5" value={tension} onChange={(e) => setTension(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-[#191433] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">TÉMA / VÝZVA</label>
              <textarea
                value={theme} onChange={(e) => setTheme(e.target.value)}
                placeholder="O čem by měl příběh být? (Např. začátek školky, překonání strachu ze tmy, výprava za diamantovým mečem...)"
                className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-4 py-3 text-white h-24 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition placeholder-purple-400/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">DÉLKA PŘÍBĚHU</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ['short', 'Rychlovka', '3 min'],
                  ['medium', 'Poctivý příběh', '10 min'],
                  ['long', 'Epické dobrodružství', '20+ min']
                ].map(([id, label, time]) => (
                  <button
                    key={id} type="button" onClick={() => setLength(id)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${length === id ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.1)]' : 'bg-[#191433] border-purple-950 text-purple-300/60 hover:border-purple-900'}`}
                  >
                    <span className="text-xs font-bold leading-tight">{label}</span>
                    <span className="text-[10px] text-amber-500/50 mt-0.5">{time}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-500 text-slate-950 font-black py-4 rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50 text-base tracking-wide flex items-center justify-center gap-2"
            >
              Vykovat příběh ✨
            </button>
          </form>
        </div>

        {/* PROSTŘEDNÍ PANEL: VÝSTUP / LOADING */}
        <div className="lg:col-span-4 bg-[#120e24]/30 border border-purple-950/20 rounded-2xl p-6 flex flex-col min-h-[500px] justify-center items-center relative overflow-hidden">
          
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl w-full text-center mb-4">
              {error}
            </div>
          )}

          {!isLoading && !story && (
            <div className="text-center p-8 max-w-sm space-y-3">
              <span className="text-4xl block opacity-40">📖</span>
              <h3 className="text-lg font-bold text-purple-200">Kniha osudů čeká</h3>
              <p className="text-purple-400/50 text-xs leading-relaxed">Zadej parametry hrdiny a stiskni tlačítko Vykovat příběh. Skutečná generativní inteligence stvoří unikátní text.</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center space-y-6 z-10">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-purple-950 border-t-emerald-400 border-r-amber-400 animate-spin"></div>
              <p className="text-purple-200 font-medium text-base animate-pulse max-w-xs">{currentLoadingText}</p>
            </div>
          )}

          {!isLoading && story && (
            <div className="w-full space-y-6 animate-fadeIn">
              <img src={story.image} alt="Ilustrace" className="w-full h-44 object-cover rounded-xl border border-purple-950" />
              <div className="space-y-3">
                <h3 className="text-xl font-black text-amber-400 leading-tight">{story.title}</h3>
                <div className="text-purple-100/90 leading-relaxed text-sm text-justify max-h-72 overflow-y-auto pr-1 space-y-3 custom-scrollbar whitespace-pre-line">
                  {story.text}
                </div>
              </div>
              
              <div className="pt-4 border-t border-purple-950/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-purple-300 font-medium">Hlas vypravěče:</span>
                  <div className="bg-[#191433] p-0.5 rounded-lg border border-purple-950">
                    <button onClick={() => setVoiceGender('female')} className={`px-2.5 py-1 text-xs rounded transition ${voiceGender === 'female' ? 'bg-emerald-600 text-white font-semibold' : 'text-purple-400'}`}>Vypravěčka</button>
                    <button onClick={() => setVoiceGender('male')} className={`px-2.5 py-1 text-xs rounded transition ${voiceGender === 'male' ? 'bg-emerald-600 text-white font-semibold' : 'text-purple-400'}`}>Vypravěč</button>
                  </div>
                </div>
                <button onClick={handlePlayAudio} className="w-full py-3 bg-[#191433] border border-emerald-500/30 rounded-xl font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition text-sm shadow-md">
                  {isPlaying ? '🛑 Zastavit čtení' : '🔊 Přečíst příběh nahlas'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PRAVÝ PANEL: VIP SEKCE */}
        <div className="lg:col-span-3 space-y-6">
          {['Moje Kovárna', 'Veřejná knihovna'].map((title) => (
            <div key={title} className="bg-[#120e24] border border-purple-950/40 rounded-2xl p-4 opacity-30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#09070f]/90 flex flex-col justify-center items-center text-center p-2 z-10">
                <span className="text-amber-400 mb-1 text-sm">🔒</span>
                <h4 className="text-xs font-bold text-white mb-0.5">{title}</h4>
                <p className="text-[10px] text-purple-300">Pouze pro VIP členy.</p>
              </div>
              <h3 className="text-xs font-bold text-purple-400 mb-2">{title}</h3>
              <div className="h-12 bg-[#191433] rounded-lg"></div>
            </div>
          ))}

          <div className="bg-gradient-to-br from-emerald-500/10 via-purple-950/20 to-[#120e24] border border-emerald-500/20 rounded-2xl p-5 shadow-lg relative">
            <h3 className="text-base font-black text-amber-400 mb-1">Mistr Kovář VIP</h3>
            <p className="text-[11px] text-purple-300 mb-4 leading-relaxed">Odemkni ukládání příběhů navždy, prémiové české hlasy a sdílenou knihovnu.</p>
            <button onClick={() => alert("Děkujeme za zájem o VIP sekci v tomto prototypu!")} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl hover:from-amber-400 transition shadow">
              Aktivovat za 99 Kč / měsíc
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
