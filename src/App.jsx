import React, { useState, useEffect } from 'react';

// Databáze náhodných kombinací pro funkci Překvap mě
const SURPRISE_POOL = [
  { name: "Bella a David", age: "5-7", tension: 2, length: "medium", theme: "Sžívání se s Lukášem – novým partnerem maminky. Bella ho má ráda, ale David se schovává do svého bunkru a AI pomůže najít společnou pohádkovou řeč." },
  { name: "Anička", age: "2-4", tension: 1, length: "short", theme: "Skřítek Ponožkovník schovává věci po pokoji, protože z nich staví tajný koráb pro medvídky." },
  { name: "Kryštof", age: "8-12", tension: 4, length: "long", theme: "Nález starého svítícího krystalu v jeskyni pod školou, který otevírá portál do světa, kde se mluví pozpátku." },
  { name: "Max", age: "13+", tension: 5, length: "medium", theme: "Digitální virus infikoval holografické město a hlavní hrdina musí vyřešit logickou hádanku starého mainframe systému." },
  { name: "Elenka", age: "5-7", tension: 3, length: "medium", theme: "Jak překonat strach ze tmy a z hluků za oknem, které ve skutečnosti dělá zapomnětlivý větrný meluzínek." }
];

export default function App() {
  const [heroName, setHeroName] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-7');
  const [tension, setTension] = useState(3);
  const [theme, setTheme] = useState('');
  const [length, setLength] = useState('medium');

  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState('');
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  const [notionWarning, setNotionWarning] = useState(null);
  
  const [savedStories, setSavedStories] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [voiceGender, setVoiceGender] = useState('female');
  const [isPlaying, setIsPlaying] = useState(false);

  const loadingMessages = [
    "Kovám tvůj příběh v magické výhni...",
    "Míchám ingredience čisté fantazie...",
    "Zapisuji kompletní zadání do tvého Notionu...",
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
      console.error("Historii z Notionu se nepodařilo načíst.");
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

  // FUNKCE PŘEKVAP MĚ
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

  const handleForgeStory = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStory(null);
    setError(null);
    setNotionWarning(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);

    const ageLabels = { '2-4': '2-4 roky (Batole)', '5-7': '5-7 let (Předškolák)', '8-12': '8-12 let (Školák)', '13+': '13+ let (Mladý dospělý)' };
    const tensionLabels = { 1: 'Klidná usínací', 2: 'Pohodová', 3: 'Dobrodružná', 4: 'Napínavá', 5: 'Lehce strašidelná' };
    const lengthLabels = { short: 'krátký (3 minuty)', medium: 'střední (10 minut)', long: 'epický (20+ minut)' };

    const systemPrompt = `Jsi elitní spisovatel dětských knih. Napíšeš originální příběh v češtině.
    CRITICAL GRAMMAR RULE: Podívej se na jméno hrdiny a přizpůsob tomu koncovky sloves v minulém čase (odešel vs odešla). V textu nesmí být ŽÁDNÁ rodová lomítka ani závorky.
    STRICT FORMATTING RULE: Tvůj výstup musí striktně dodržet formátování:
    [NAZEV] Sem název příběhu
    [TEXT] Sem text příběhu rozdělený do odstavců.`;

    const userPrompt = `Parametry: Jméno: ${heroName}, Věk: ${ageLabels[ageGroup]}, Atmosféra: ${tensionLabels[tension]}, Téma: ${theme}, Délka: ${lengthLabels[length]}`;

    // Objekt s čitelnými daty pro uložení do Notion struktury
    const inputDetails = {
      heroName,
      age: ageLabels[ageGroup],
      tension: tensionLabels[tension],
      length: lengthLabels[length],
      theme
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt, inputDetails })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Chyba na serveru.");
      }
      
      const data = await response.json();
      
      setStory({
        title: data.title,
        text: data.text,
        image: getStoryImage(ageGroup)
      });

      // Kontrola, zda ukládání do Notionu proběhlo hladce
      if (data.notionStatus !== "Uspěšně uloženo") {
        setNotionWarning(`Příběh vykován, ale zápis do Notionu selhal (${data.notionErrorDetails || data.notionStatus}). Zkontroluj propojení (Connection) v tabulce.`);
      }

      fetchHistory();

    } catch (err) {
      setError(err.message || "Během generování se stala chyba.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (!story || !story.text) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SynthesisUtterance(story.title + ". " + story.text);
      utterance.lang = 'cs-CZ';
      const voices = window.speechSynthesis.getVoices();
      const czechVoices = voices.filter(v => v.lang.startsWith('cs'));

      if (czechVoices.length > 0) {
        const selectedVoice = czechVoices.find(v => {
          const name = v.name.toLowerCase();
          return voiceGender === 'female' ? name.includes('female') : name.includes('male');
        }) || czechVoices[0];
        utterance.voice = selectedVoice;
      }
      utterance.onend = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-[#09070f] text-gray-100 font-sans antialiased p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center border-b border-purple-950/40 pb-4">
        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent">StoryLab</span>
        <button 
          type="button" onClick={handleSurpriseMe}
          className="bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl transition shadow shadow-amber-500/5"
        >
          🎲 PŘEKVAP MĚ
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEVÝ PANEL (Šířka 3) */}
        <div className="lg:col-span-3 bg-[#120e24] border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-5 h-fit">
          <h2 className="text-lg font-bold text-emerald-400 tracking-wide">Kovárna Příběhů</h2>
          <form onSubmit={handleForgeStory} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Jméno hrdiny</label>
              <input type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)} placeholder="Např. Eliška, David..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" required />
            </div>
            
            {/* VĚK DOBRODRUHA - Kompletně opravené popisky */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Věk dobrodruha</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[ 
                  ['2-4', 'Batolata', '2-4 roky'], 
                  ['5-7', 'Předškoláci', '5-7 let'], 
                  ['8-12', 'Školáci', '8-12 let'], 
                  ['13+', 'Mladí dospělí', '13+ let'] 
                ].map(([id, label, ageRange]) => (
                  <button key={id} type="button" onClick={() => setAgeGroup(id)} className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-center ${ageGroup === id ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-[#191433] border-purple-950 text-purple-300/60 hover:border-purple-900'}`}>
                    <span className="font-bold text-xs block leading-tight">{label}</span>
                    <span className="text-[10px] text-purple-400/40 block mt-0.5 font-normal">{ageRange}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
                <span>ÚROVEŇ NAPĚTÍ</span>
                <span className="text-amber-400 font-bold">
                  {tension === 1 && 'Usínací'} {tension === 2 && 'Pohodová'}
                  {tension === 3 && 'Dobrodružná'} {tension === 4 && 'Napínavá'}
                  {tension === 5 && 'Strašidelná'}
                </span>
              </div>
              <input type="range" min="1" max="5" value={tension} onChange={(e) => setTension(Number(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-[#191433] rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">TÉMA / VÝZVA</label>
              <textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="O čem by měl příběh být?..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">DÉLKA PŘÍBĚHU</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[ ['short', 'Rychlovka (3 min)'], ['medium', 'Poctivý příběh (10 min)'], ['long', 'Epické dobrodružství'] ].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setLength(id)} className={`p-2 rounded-xl border text-center text-xs font-bold transition ${length === id ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-300/60 hover:border-purple-900'}`}>{label}</button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:opacity-95 text-sm tracking-wide">Vykovat příběh ✨</button>
          </form>
        </div>

        {/* PROSTŘEDNÍ PANEL (Šířka 6) */}
        <div className="lg:col-span-6 bg-[#120e24]/30 border border-purple-950/20 rounded-2xl p-6 flex flex-col min-h-[550px] justify-center items-center relative">
          {error && <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl w-full text-center mb-4">{error}</div>}
          {notionWarning && <div className="p-3 bg-amber-950/30 border border-amber-500/20 text-amber-300 text-[11px] rounded-xl w-full text-center mb-4">{notionWarning}</div>}

          {!isLoading && !story && (
            <div className="text-center p-8 max-w-sm space-y-3">
              <span className="text-5xl block opacity-40">📖</span>
              <h3 className="text-lg font-bold text-purple-200">Kniha osudů čeká</h3>
              <p className="text-purple-400/50 text-sm">Příběhy se automaticky ukládají do tvého Notionu včetně kompletního nastavení.</p>
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

        {/* PRAVÝ PANEL (Šířka 3) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#120e24] border border-purple-950/40 rounded-2xl p-4 shadow-xl flex flex-col max-h-[280px]">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3 border-b border-purple-950/50 pb-2">Moje Kovárna ({savedStories.length})</h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
              {loadingHistory ? (
                <p className="text-[11px] text-purple-400/40 text-center py-4 animate-pulse">Načítám z Notionu...</p>
              ) : savedStories.length === 0 ? (
                <p className="text-[11px] text-purple-400/40 text-center py-4 italic">V Notionu zatím nic není...</p>
              ) : (
                savedStories.map((item) => (
                  <div key={item.id} className="w-full text-left p-2.5 rounded-xl border border-purple-950 bg-[#191433] text-purple-200">
                    <span className="font-bold block truncate text-xs text-emerald-400 mb-0.5">📝 {item.title}</span>
                    <span className="text-[10px] text-purple-400/50 block">Uloženo: {item.date}</span>
                  </div>
                ))
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
