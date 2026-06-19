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

  // Pomocná funkce pro analýzu odpovědi od AI
  const parseAIResponse = (rawText) => {
    const titleMatch = rawText.match(/\[NAZEV\]\s*(.*)/i);
    const textMatch = rawText.match(/\[TEXT\]\s*([\s\S]*)/i);
    
    let title = titleMatch ? titleMatch[1].trim() : "Magické dobrodružství";
    let text = textMatch ? textMatch[1].trim() : rawText;
    
    text = text.replace(/\[NAZEV\].*$/gmi, '').replace(/\[TEXT\]/gmi, '').trim();
    
    let imageUrl = "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80";
    if (ageGroup === '2-4') imageUrl = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80";
    if (ageGroup === '8-12') imageUrl = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80";
    if (ageGroup === '13+') imageUrl = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80";

    return { title, text, image: imageUrl };
  };

  // VOLÁNÍ NAŠEHO VERCEL SERVERU
  const handleForgeStory = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStory(null);
    setError(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);

    const ageLabels = { '2-4': '2-4 roky (Batole)', '5-7': '5-7 let (Předškolák)', '8-12': '8-12 let (Školák)', '13+': '13+ let (Mladý dospělý)' };
    const tensionLabels = { 1: 'Klidná usínací', 2: 'Pohodová', 3: 'Dobrodružná', 4: 'Napínavá', 5: 'Lehce strašidelná' };
    const lengthLabels = { short: 'krátký (3 minuty)', medium: 'střední (10 minut)', long: 'epický (20+ minut)' };

    const systemPrompt = `Jsi elitní spisovatel dětských knih a fantasy příběhů. Napíšeš originální příběh v češtině.
    CRITICAL GRAMMAR RULE: Podívej se na jméno hrdiny a zjisti/odhadni, zda se jedná o kluka nebo holku. Striktně tomu přizpůsob koncovky sloves v minulém čase (např. odešel vs. odešla). V textu nesmí být ŽÁDNÁ rodová lomítka (odešel/odešla) ani závorky. Příběh musí být plynulý, gramaticky dokonalý a laskavý.
    STRICT FORMATTING RULE: Tvůj výstup musí striktně dodržet formátování pomocí dvou značek takto:
    [NAZEV] Sem napiš originální název příběhu
    [TEXT] Sem napiš kompletní text příběhu rozdělený do čitelných odstavců.`;

    const userPrompt = `Parametry pro příběh:
    - Jméno hlavního hrdiny: ${heroName}
    - Věková kategorie: ${ageLabels[ageGroup]}
    - Úroveň napětí/atmosféra: ${tensionLabels[tension]}
    - Hlavní téma/zápletka: ${theme}
    - Požadovaná délka: ${lengthLabels[length]}`;

    try {
      // Voláme náš skrytý Vercel server, ne přímo OpenAI!
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Chyba na serveru.");
      }
      
      const data = await response.json();
      const rawResult = data.choices[0].message.content;

      const processedStory = parseAIResponse(rawResult);
      setStory(processedStory);

    } catch (err) {
      setError(err.message || "Během generování příběhu se stala chyba.");
    } finally {
      setIsLoading(false);
    }
  };

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
      alert("Tento prohlížeč nepodporuje syntézu řeči.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09070f] text-gray-100 font-sans antialiased p-4 md:p-8">
      
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center border-b border-purple-950/40 pb-4">
        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent">
          StoryLab
        </span>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-xs font-semibold">
          PRODUKČNÍ AI VERZE
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEVÝ PANEL */}
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
                  ['2-4', 'Batolata', '2–4 roky'], ['5-7', 'Předškoláci', '5–7 let'],
                  ['8-12', 'Školáci', '8–12 let'], ['13+', 'Mladí dospělí', '13+ let']
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
                  {tension === 1 && 'Usínací 🌟'} {tension === 2 && 'Pohodová 🍃'}
                  {tension === 3 && 'Dobrodružná ⚔️'} {tension === 4 && 'Napínavá 🔥'}
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
                placeholder="O čem by měl příběh být?..."
                className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-4 py-3 text-white h-24 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">DÉLKA PŘÍBĚHU</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['short', 'Rychlovka', '3 min'], ['medium', 'Poctivý', '10 min'], ['long', 'Epické', '20+ min']
                ].map(([id, label, time]) => (
                  <button
                    key={id} type="button" onClick={() => setLength(id)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${length === id ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-300/60 hover:border-purple-900'}`}
                  >
                    <span className="text-xs font-bold">{label}</span>
                    <span className="text-[10px] text-amber-500/50">{time}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-500 text-slate-950 font-black py-4 rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50 text-base"
            >
              Vykovat příběh ✨
            </button>
          </form>
        </div>

        {/* PROSTŘEDNÍ PANEL */}
        <div className="lg:col-span-4 bg-[#120e24]/30 border border-purple-950/20 rounded-2xl p-6 flex flex-col min-h-[500px] justify-center items-center relative">
          {error && <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl w-full text-center mb-4">{error}</div>}

          {!isLoading && !story && (
            <div className="text-center p-8 max-w-sm space-y-3">
              <span className="text-4xl block opacity-40">📖</span>
              <h3 className="text-lg font-bold text-purple-200">Kniha osudů čeká</h3>
              <p className="text-purple-400/50 text-xs">Zadej parametry hrdiny a stiskni tlačítko Vykovat příběh.</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-purple-950 border-t-emerald-400 border-r-amber-400 animate-spin"></div>
              <p className="text-purple-200 font-medium text-base animate-pulse">{currentLoadingText}</p>
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
                    <button onClick={() => setVoiceGender('female')} className={`px-2.5 py-1 text-xs rounded ${voiceGender === 'female' ? 'bg-emerald-600 text-white' : 'text-purple-400'}`}>Vypravěčka</button>
                    <button onClick={() => setVoiceGender('male')} className={`px-2.5 py-1 text-xs rounded ${voiceGender === 'male' ? 'bg-emerald-600 text-white' : 'text-purple-400'}`}>Vypravěč</button>
                  </div>
                </div>
                <button onClick={handlePlayAudio} className="w-full py-3 bg-[#191433] border border-emerald-500/30 rounded-xl font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition text-sm">
                  {isPlaying ? '🛑 Zastavit čtení' : '🔊 Přečíst příběh nahlas'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PRAVÝ PANEL */}
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

          <div className="bg-gradient-to-br from-emerald-500/10 via-purple-950/20 to-[#120e24] border border-emerald-500/20 rounded-2xl p-5 shadow-lg">
            <h3 className="text-base font-black text-amber-400 mb-1">Mistr Kovář VIP</h3>
            <p className="text-[11px] text-purple-300 mb-4 leading-relaxed">Odemkni ukládání příběhů navždy, prémiové české hlasy (ElevenLabs) a historii.</p>
            <button onClick={() => alert("Děkujeme za zájem o VIP!")} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl">
              Aktivovat za 99 Kč / měsíc
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
