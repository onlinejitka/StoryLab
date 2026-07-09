import React, { useState, useEffect } from 'react';

const SURPRISE_POOL = [
  { name: "Bella a David", age: "5-7", tension: 2, length: "medium", theme: "Sžívání se s Lukášem – novým partnerem maminky. Bella ho má ráda, ale David se schovává do svého bunkru a AI pomůže najít společnou pohádkovou řeč." },
  { name: "Anička", age: "2-4", tension: 1, length: "short", theme: "Skřítek Ponožkovník schovává věci po pokoji, protože z nich staví tajný koráb pro medvídky." },
  { name: "Kryštof", age: "8-12", tension: 4, length: "long", theme: "Nález starého svítícího krystalu v jeskyni pod školou, který otevírá portál do světa, kde se mluví pozpátku." }
];

export default function App() {
  const [heroName, setHeroName] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-7');
  const [tension, setTension] = useState(3);
  const [theme, setTheme] = useState('');
  const [length, setLength] = useState('medium');
  
  // Stav pro tajný přístupový kód (načte se z paměti)
  const [passcode, setPasscode] = useState(() => localStorage.getItem('sl_passcode') || '');

  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState('');
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  
  const [savedStories, setSavedStories] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [voiceGender, setVoiceGender] = useState('female');
  const [isPlaying, setIsPlaying] = useState(false);

  const loadingMessages = [
    "Ověřuji tvé Forendors členství...",
    "Kovám tvůj příběh v magické výhni...",
    "Míchám ingredience čisté fantazie...",
    "Probouzím pohádkové postavy k životu...",
    "Učesávám českou gramatiku..."
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        const data = await res.json();
        setSavedStories(data);
      }
    } catch (err) {
      console.error("Historii se nepodařilo načíst.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * SURPRISE_POOL.length);
    const randomConfig = SURPRISE_POOL[randomIndex];
    setHeroName(randomConfig.name);
    setAgeGroup(randomConfig.age);
    setTension(randomConfig.tension);
    setLength(randomConfig.length);
    setTheme(randomConfig.theme);
  };

  const getStoryImage = (age) => {
    if (age === '2-4') return "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80";
    if (age === '8-12') return "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80";
    if (age === '13+') return "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80";
    return "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80";
  };

  const handleSelectHistoryStory = async (item) => {
    setIsLoading(true);
    setStory(null);
    setError(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentLoadingText("Otevírám starou kroniku...");

    try {
      const res = await fetch(`/api/story?id=${item.id}`);
      if (!res.ok) throw new Error("Text příběhu se nepodařilo načíst.");
      const data = await res.json();
      setStory({ id: item.id, title: data.title, text: data.text, image: getStoryImage(ageGroup) });
    } catch (err) {
      setError(err.message || "Chyba při otevírání příběhu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgeStory = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStory(null);
    setError(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);

    // Uložíme kód do paměti prohlížeče pro příště
    localStorage.setItem('sl_passcode', passcode);

    const ageLabels = { '2-4': '2-4 roky', '5-7': '5-7 let', '8-12': '8-12 let', '13+': '13+ let' };
    const tensionLabels = { 1: 'Klidná usínací', 2: 'Pohodová', 3: 'Dobrodružná', 4: 'Napínavá', 5: 'Strašidelná' };
    const lengthLabels = { 
      short: 'KRÁTKÝ příběh (cca 3 až 4 odstavce).', 
      medium: 'VELMI DLOUHÝ, POCTIVÝ PŘÍBĚH na 10 minut čtení (12 až 18 odstavců).', 
      long: 'EPICKÝ ROZSÁHLÝ EPOS NA KAPITOLY (25 až 35 odstavců).' 
    };

    const systemPrompt = `Jsi spisovatel dětských knih. Napíšeš originální příběh v češtině. Koncovky minulého času přizpůsob jménu hrdiny (odešel/odešla). Žádná rodová lomítka!`;
    const userPrompt = `Parametry: Jméno: ${heroName}, Věk: ${ageLabels[ageGroup]}, Atmosféra: ${tensionLabels[tension]}, Téma: ${theme}, Délka: ${lengthLabels[length]}`;

    const inputDetails = {
      heroName, age: ageLabels[ageGroup], tension: tensionLabels[tension],
      length: length === 'short' ? 'Rychlovka' : length === 'medium' ? 'Poctivý příběh' : 'Epické dobrodružství', theme
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt, inputDetails, passcode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Chyba na serveru.");
      }
      
      setStory({ title: data.title, text: data.text, image: getStoryImage(ageGroup) });
      fetchHistory();

    } catch (err) {
      setError(err.message || "Během generování se stala chyba.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (!story || !story.text) return;
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(story.title + ". " + story.text);
      utterance.lang = 'cs-CZ';
      utterance.onend = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const freeStories = savedStories.slice(0, 3);
  const lockedCount = savedStories.length > 3 ? savedStories.length - 3 : 0;

  return (
    <div className="min-h-screen bg-[#09070f] text-gray-100 font-sans antialiased p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center border-b border-purple-950/40 pb-4">
        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent">StoryLab</span>
        <button type="button" onClick={handleSurpriseMe} className="bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl transition shadow shadow-amber-500/5">🎲 PŘEKVAP MĚ</button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEVÝ PANEL */}
        <div className="lg:col-span-3 bg-[#120e24] border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-5 h-fit">
          <h2 className="text-lg font-bold text-emerald-400 tracking-wide">Kovárna Příběhů</h2>
          <form onSubmit={handleForgeStory} className="space-y-5">
            
            {/* NOVÉ POLÍČKO PRO PŘÍSTUPOVÝ KÓD */}
            <div className="bg-purple-950/20 border border-purple-900/40 p-3 rounded-xl space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-400">🔑 Přístupový kód (Forendors)</label>
              <input 
                type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} 
                placeholder="Vlož tajný kód z profilu..." 
                className="w-full bg-[#191433] border border-purple-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required 
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Jméno hrdiny</label>
              <input type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)} placeholder="Např. Eliška, David..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" required />
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Věk dobrodruha</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[ ['2-4', 'Batolata', '2-4 roky'], ['5-7', 'Předškoláci', '5-7 let'], ['8-12', 'Školáci', '8-12 let'], ['13+', 'Mladí dospělí', '13+ let'] ].map(([id, label, ageRange]) => (
                  <button key={id} type="button" onClick={() => setAgeGroup(id)} className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-center ${ageGroup === id ? 'bg-emerald-950/30 border-emerald-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-300/60'}`}>
                    <span className="font-bold text-xs block leading-tight">{label}</span>
                    <span className="text-[10px] text-purple-400/40 block mt-0.5 font-normal">{ageRange}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
                <span>ÚROVEŇ NAPĚTÍ</span>
                <span className="text-amber-400 font-bold">{tension === 1 && 'Usínací'} {tension === 2 && 'Pohodová'} {tension === 3 && 'Dobrodružná'} {tension === 4 && 'Napínavá'} {tension === 5 && 'Strašidelná'}</span>
              </div>
              <input type="range" min="1" max="5" value={tension} onChange={(e) => setTension(Number(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-[#191433] rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">TÉMA / VÝZVA</label>
              <textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="O čem by měl příběh být?..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">DÉLKA PŘÍBĚHU</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[ ['short', 'Rychlovka (3 min)'], ['medium', 'Poctivý příběh (10 min)'], ['long', 'Epické dobrodružství'] ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setLength(id)} className={`p-2 rounded-xl border text-center text-xs font-bold transition ${length === id ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-300/60'}`}>{label}</button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:opacity-95 text-sm tracking-wide">Vykovat příběh ✨</button>
          </form>
        </div>

        {/* PROSTŘEDNÍ PANEL */}
        <div className="lg:col-span-6 bg-[#120e24]/30 border border-purple-950/20 rounded-2xl p-6 flex flex-col min-h-[550px] justify-center items-center relative">
          
          {/* PRÉMIOVÉ ZOBRAZENÍ CHYBY Z FORENDORS S ODKAZEM */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl w-full text-center mb-4 flex flex-col items-center gap-2">
              <span>{error}</span>
              {error.includes("Forendors") && (
                <a 
                  href="https://www.forendors.cz" target="_blank" rel="noreferrer" 
                  className="mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg font-bold transition block text-center"
                >
                  👉 Chci získat kód na Forendors
                </a>
              )}
            </div>
          )}
          
          {notionWarning && <div className="p-3 bg-amber-950/30 border border-amber-500/20 text-amber-300 text-[11px] rounded-xl w-full text-center mb-4">{notionWarning}</div>}

          {!isLoading && !story && (
            <div className="text-center p-8 max-w-sm space-y-3">
              <span className="text-5xl block opacity-40">📖</span>
              <h3 className="text-lg font-bold text-purple-200">Kniha osudů čeká</h3>
              <p className="text-purple-400/50 text-sm">Zadej parametry vlevo, stiskni tlačítko a vyraz na kouzelnou cestu. Tvá osobní knižní sbírka se začne plnit unikátními příběhy.</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-purple-950 border-t-emerald-400 border-r-amber-400 animate-spin"></div>
              <p className="text-purple-200 font-medium text-lg animate-pulse">{currentLoadingText}</p>
            </div>
          )}

          {!isLoading && story && (
            <div className="w-full space-y-6 animate-fadeIn">
              {story.image && <img src={story.image} alt="Ilustrace" className="w-full h-56 object-cover rounded-xl border border-purple-950 shadow-md" />}
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-amber-400 leading-tight border-b border-purple-950/40 pb-2">{story.title}</h3>
                <div className="text-purple-50/95 leading-relaxed text-base md:text-lg text-justify max-h-[420px] overflow-y-auto pr-3 space-y-4 custom-scrollbar whitespace-pre-line font-medium">
                  {story.text}
                </div>
              </div>
              {story.text && (
                <div className="pt-4 border-t border-purple-950/60 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-purple-300 font-medium">Hlas vypravěče:</span>
                    <div className="bg-[#191433] p-0.5 rounded-lg border border-purple-950">
                      <button onClick={() => setVoiceGender('female')} className={`px-3 py-1 text-xs rounded transition ${voiceGender === 'female' ? 'bg-emerald-600 text-white font-bold' : 'text-purple-400'}`}>Vypravěčka</button>
                      <button onClick={() => setVoiceGender('male')} className={`px-3 py-1 text-xs rounded transition ${voiceGender === 'male' ? 'bg-emerald-600 text-white font-bold' : 'text-purple-400'}`}>Vypravěč</button>
                    </div>
                  </div>
                  <button onClick={handlePlayAudio} className="w-full py-3 bg-[#191433] border border-emerald-500/30 rounded-xl font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-sm">
                    {isPlaying ? '🛑 Zastavit čtení' : '🔊 Přečíst příběh nahlas'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRAVÝ PANEL */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#120e24] border border-purple-950/40 rounded-2xl p-4 shadow-xl flex flex-col max-h-[380px]">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3 border-b border-purple-950/50 pb-2">Moje Kovárna ({savedStories.length})</h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
              {loadingHistory ? (
                <p className="text-[11px] text-purple-400/40 text-center py-4 animate-pulse">Načítám příběhy...</p>
              ) : savedStories.length === 0 ? (
                <p className="text-[11px] text-purple-400/40 text-center py-4 italic">V knihovně zatím nic není...</p>
              ) : (
                <>
                  {freeStories.map((item) => (
                    <button key={item.id} type="button" onClick={() => handleSelectHistoryStory(item)} className={`w-full text-left p-2.5 rounded-xl border text-xs transition block truncate ${story?.id === item.id ? 'bg-emerald-950/20 border-emerald-500 text-emerald-300' : 'bg-[#191433] border-purple-950 text-purple-200 hover:border-purple-800'}`}>
                      <span className="font-bold block truncate text-xs text-emerald-400 mb-0.5">📖 {item.title}</span>
                      <span className="text-[10px] text-purple-400/50 block">Klikni pro otevření</span>
                    </button>
                  ))}
                  {lockedCount > 0 && (
                    <div className="p-3 rounded-xl border border-dashed border-purple-950/60 bg-purple-950/10 flex flex-col items-center justify-center text-center mt-2 space-y-1">
                      <span className="text-sm">🔒</span>
                      <span className="text-[11px] font-bold text-amber-400/90">+{lockedCount} dalších příběhů</span>
                      <span className="text-[9px] text-purple-400 max-w-[150px] leading-tight">Historie nad 3 položky vyžaduje VIP členství.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-[#120e24] border border-purple-950/40 rounded-2xl p-4 opacity-30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#09070f]/90 flex flex-col justify-center items-center text-center p-2 z-10">
              <span className="text-amber-400 mb-1 text-sm">🔒</span>
              <h4 className="text-xs font-bold text-white mb-0.5">Veřejná knihovna</h4>
              <p className="text-[10px] text-purple-300">Pouze pro VIP členy.</p>
            </div>
            <h3 className="text-xs font-bold text-purple-400 mb-2">Veřejná knihovna</h3>
            <div className="h-12 bg-[#191433] rounded-lg"></div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 via-purple-950/20 to-[#120e24] border border-emerald-500/20 rounded-2xl p-5 shadow-lg">
            <h3 className="text-base font-black text-amber-400 mb-1">Mistr Kovář VIP</h3>
            <p className="text-[11px] text-purple-300 mb-4 leading-relaxed">Odemkni ultra-realistické předčítání přes **ElevenLabs** a sdílení knihovny s ostatními uživateli.</p>
            <button onClick={() => alert("Děkujeme za zájem o VIP!")} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl">Aktivovat za 99 Kč / měsíc</button>
          </div>
        </div>

      </main>
    </div>
  );
}
