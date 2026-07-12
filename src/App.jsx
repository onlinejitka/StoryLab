import React, { useState, useEffect } from 'react';

const SURPRISE_POOL = [
  { name: "Bella a David", age: "5-7", tension: 2, length: "medium", theme: "Sžívání se s Lukášem – novým partnerem maminky. Bella ho má ráda, ale David se schovává do svého bunkru a AI pomůže najít společnou pohádkovou řeč." },
  { name: "Anička", age: "2-4", tension: 1, length: "short", theme: "Skřítek Ponožkovník schovává věci po pokoji, protože z nich staví tajný koráb pro medvídky." },
  { name: "Kryštof", age: "8-12", tension: 4, length: "long", theme: "Nález starého svítícího krystalu v jeskyni pod školou, který otevírá portál do sveta, kde se mluví pozpátku." },
  { name: "Max", age: "13+", tension: 5, length: "medium", theme: "Digitální virus infikoval holografické město a hlavní hrdina mustí vyřešit logickou hádanku starého mainframe systému." },
  { name: "Elenka", age: "5-7", tension: 3, length: "medium", theme: "Jak překonat strach ze tmy a z hluků za oknem, které ve skutečnosti dělá zapomnětlivý větrný meluzínek." }
];

export default function App() {
  const [heroName, setHeroName] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-7');
  const [tension, setTension] = useState(3);
  const [theme, setTheme] = useState('');
  const [length, setLength] = useState('medium');

  const [passcode, setPasscode] = useState('');
  const [passcodeStatus, setPasscodeStatus] = useState(''); 
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);

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
    "Probouzím pohádkové postavy k životu...",
    "Rozvíjím dlouhé kapitoly vyprávění...",
    "Učesávám českou gramatiku..."
  ];

  // Pomocná funkce pro výběr ilustračního obrázku podle věku
  const getStoryImage = (age) => {
    if (age === '2-4') return "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80";
    if (age === '8-12') return "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80";
    if (age === '13+') return "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80";
    return "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80";
  };

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
    const savedCode = localStorage.getItem('sl_passcode');
    if (savedCode) {
      setPasscode(savedCode);
      setPasscodeStatus('✓ Kód je aktivní');
    }
    
    const trialUsed = localStorage.getItem('sl_free_story_used');
    if (trialUsed === 'true') {
      setFreeTrialUsed(true);
    }
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

  const openStripePopup = (e) => {
    e.preventDefault();
    const url = "https://buy.stripe.com/8x2fZh8CZ2H2eD73aQ9IQ0q";
    const width = 540;
    const height = 760;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(url, 'Noční Knihovna Platba', `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,scrollbars=yes,resizable=yes`);
  };

  const handleConfirmPasscode = () => {
    if (!passcode.trim()) {
      setPasscodeStatus('❌ Kód nesmí být prázdný');
      return;
    }
    localStorage.setItem('sl_passcode', passcode);
    setPasscodeStatus('✓ Kód byl úspěšně potvrzen');
    setTimeout(() => setPasscodeStatus('✓ Kód je aktivní'), 3000);
  };

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * SURPRISE_POOL.length);
    const randomConfig = SURPRISE_POOL[randomIndex];
    setHeroName(randomConfig.name);
    setAgeGroup(randomConfig.age);
    setTension(randomConfig.tension);
    setLength(randomConfig.length);
    setTheme(randomConfig.theme);
  };

  const handleSelectHistoryStory = async (item) => {
    setIsLoading(true);
    setStory(null);
    setError(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentLoadingText("Otevírám starou kroniku a listuji v kapitolách...");
    try {
      const res = await fetch(`/api/story?id=${item.id}`);
      if (!res.ok) throw new Error("Text příběhu se nepodařilo stáhnout.");
      const data = await res.json();
      setStory({ id: item.id, title: data.title, text: data.text, image: getStoryImage(ageGroup) });
    } catch (err) {
      setError(err.message);
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

    let activePasscode = passcode.trim();
    let isUsingFreeTrial = false;

    if (!activePasscode && !freeTrialUsed) {
      activePasscode = 'SL-FREE-TRIAL';
      isUsingFreeTrial = true;
    }

    const ageLabels = { '2-4': '2-4 roky', '5-7': '5-7 let', '8-12': '8-12 let', '13+': '13+ let' };
    const tensionLabels = { 1: 'Klidná usínací', 2: 'Pohodová', 3: 'Dobrodružná', 4: 'Napínavá', 5: 'Strašidelná' };
    const lengthLabels = { 
      short: 'KRÁTKÝ příběh (rychlovka před spaním, cca 3 až 4 odstavce).', 
      medium: 'VELMI DLOUHÝ, POCTIVÝ PŘÍBĚH. Instrukce: Napiš minimálně 12 až 18 rozsáhlých odstavců. Děj nesmí utíkat rychle, věnuj se detailnímu popisu prostředí, pocitům postav, rozvíjej dlouhé a hluboké dialogy mezi hrdiny. Text musí být dostatečně dlouhý na 10 minut souvislého čtení!', 
      long: 'EPICKÝ ROZSÁHLÝ EPOS ROZDĚLENÝ NA KAPITOLY (např. Kapitola I, Kapitola II, Kapitola III). Instrukce: Vygeneruj obří literární dílo o minimálně 25 až 35 bohatých odstavcích. Piš maximálně barvitě, rozvíjej vedlejší zápletky, popisy scén a dramatické rozhovory, aby čtení trvalo přes 20 minut!' 
    };

    const systemPrompt = `Jsi špičkový spisovatel knih pro dětí a mládež. Tvým úkolem je napsat originální a dechberoucí příběh v češtině.
    CRITICAL GRAMMAR RULE: Pokud uživatel zadá jméno, přizpůsob tomu koncovky sloves v minulém čase (odešel vs odešla). Pokud si jméno vymýšlíš sám, vyber buď jasně klučičí nebo holčičí jméno a striktně dodržuj správné rodové koncovky. V textu nesmí být ŽÁDNÁ rodová lomítka ani závorky!
    CRITICAL LENGTH COMMAND: Striktně a nekompromisně dodrž pokyny pro rozsah v parametru Délka. Umělá inteligence má tendenci texty zkracovat – ty máš ale příkaz psát extrémně detailně, rozvláčně, používat bohatou slovní zásobu a generovat obrovské množství textu, pokud je vyžádán střední či dlouhý rozsah.
    STRICT FORMATTING RULE: Tvůj výstup musí striktně dodržet formátování:
    [NAZEV] Sem název příběhu
    [TEXT] Sem text příběhu rozdělený do odstavců.`;
    
    const finalHeroName = heroName.trim() ? heroName : "Vymysli náhodné české dětské jméno hlavního hrdiny";
    const finalTheme = theme.trim() ? theme : "Libovolné originální, milé a magické dobrodružství plné ponaučení vhodné pro daný věk";

    const userPrompt = `Parametry výstupu:
    - Jméno hlavního hrdiny: ${finalHeroName}
    - Věková kategorie: ${ageLabels[ageGroup]}
    - Úroveň napětí/atmosféra: ${tensionLabels[tension]}
    - Hlavní téma/zápletka: ${finalTheme}
    - Požadovaná délka: ${lengthLabels[length] || lengthLabels['medium']}`;
    
    const inputDetails = { heroName: finalHeroName, age: ageLabels[ageGroup], tension: tensionLabels[tension], length: length, theme: finalTheme };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt, inputDetails, passcode: activePasscode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chyba na serveru.");
      
      setStory({ title: data.title, text: data.text, image: getStoryImage(ageGroup) });
      
      if (isUsingFreeTrial) {
        localStorage.setItem('sl_free_story_used', 'true');
        setFreeTrialUsed(true);
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
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(story.title + ". " + story.text);
      utterance.lang = 'cs-CZ';
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const freeStories = savedStories.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#09070f] text-gray-100 font-sans antialiased">
      
      {/* 🌙 ŽIVÉ HLAVNÍ MENU */}
      <nav className="w-full bg-[#0c0a16] border-b border-purple-950/40 px-4 py-4 md:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <a href="https://www.nocniknihovna.cz" className="flex items-center gap-3 group hover:opacity-90 transition cursor-pointer">
            <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">🌙</span>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-wide text-amber-400 group-hover:text-amber-300 transition">Noční Knihovna</span>
              <span className="text-[10px] text-purple-300/60 font-medium tracking-wider">Klidné usínání plné příběhů</span>
            </div>
          </a>
          <div className="flex items-center gap-2 md:gap-3 text-xs font-bold">
            <a href="https://www.nocniknihovna.cz/knihovna" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-950/20 text-purple-200 hover:text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <span>Knihovna</span>
            </a>
            <a href="https://www.nocniknihovna.cz/hadanky" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-950/20 text-purple-200 hover:text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
              <span>Hádanky</span>
            </a>
            <a href="https://www.nocniknihovna.cz/omalovanky" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-950/20 text-purple-200 hover:text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-1.242 2.25 2.25 0 0 1 2.18-2.13h.008a2.25 2.25 0 0 0 2.18-2.13 2.25 2.25 0 0 1 2.18-2.13h.008a2.25 2.25 0 0 0 2.18-2.13V12a3.75 3.75 0 1 0-7.5 0v4.122Z" />
              </svg>
              <span>Omalovánky</span>
            </a>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow shadow-amber-500/10 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
              </svg>
              <span>Generátor</span>
            </div>
          </div>
        </div>
      </nav>

      {/* OBSAH APLIKACE */}
      <div className="p-4 md:p-8 pt-6">
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
          
          {/* LEVÝ PANEL */}
          <div className="lg:col-span-3 order-2 lg:order-1 bg-[#120e24] border border-purple-950/40 rounded-2xl p-5 shadow-xl space-y-5 h-fit">
            <h2 className="text-lg font-bold text-emerald-400 tracking-wide">Kovárna Příběhů</h2>
            <form onSubmit={handleForgeStory} className="space-y-5">
              
              <div className="bg-purple-950/20 border border-purple-900/40 p-3 rounded-xl space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-400">🔑 Premium Přístupový kód</label>
                <input 
                  type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} 
                  placeholder="Vložte Váš kód (např. sl-jiri-8x3a)..." 
                  className="w-full bg-[#191433] border border-purple-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required={freeTrialUsed}
                />
                <button type="button" onClick={handleConfirmPasscode} className="w-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 text-[11px] font-bold py-1.5 rounded-lg transition">Uložit kód ➔</button>
                {passcodeStatus && <span className={`text-[10px] block text-center font-medium ${passcodeStatus.includes('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{passcodeStatus}</span>}
                <a href="https://buy.stripe.com/8x2fZh8CZ2H2eD73aQ9IQ0q" onClick={openStripePopup} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline pt-0.5 block text-center">Aktivovat neomezené Premium ➔</a>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Jméno hrdiny</label>
                <input type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)} placeholder="Např. Eliška, David..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>

              {/* 📊 OPRAVENÁ VOLBA VĚKU S DVOUŘÁDKOVÝM DETAILNÍM TEXTEM (NÁZEV + ROZSAH) */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Věk dobrodruha</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[ 
                    ['2-4', 'Batolata', '2-4 roky'], 
                    ['5-7', 'Předškoláci', '5-7 let'], 
                    ['8-12', 'Školáci', '8-12 let'], 
                    ['13+', 'Mládež', '13+ let'] 
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
                  <span className="text-amber-400 font-bold">{tension === 1 ? 'Usínací' : tension === 2 ? 'Pohodová' : tension === 3 ? 'Dobrodružná' : tension === 4 ? 'Napínavá' : 'Strašidelná'}</span>
                </div>
                <input type="range" min="1" max="5" value={tension} onChange={(e) => setTension(Number(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-[#191433] rounded-lg appearance-none cursor-pointer" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">TÉMA / VÝZVA (nepovinné)</label>
                <textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="O čem by měl příběh být?..." className="w-full bg-[#191433] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-white h-20 resize-none" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">DÉLKA PŘÍBĚHU</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[ ['short', 'Rychlovka (3 min)'], ['medium', 'Poctivý příběh (10 min)'], ['long', 'Epické dobrodružství'] ].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setLength(id)} className={`p-2 rounded-xl border text-center text-xs font-bold transition ${length === id ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#191433] border-purple-950 text-purple-300/60'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:opacity-95 text-sm tracking-wide">
                {!passcode && !freeTrialUsed ? "Vyzkoušet 1 pohádku zdarma ✨" : "Vykovat příběh ✨"}
              </button>
            </form>
          </div>

          {/* PROSTŘEDNÍ PANEL */}
          <div className="lg:col-span-6 order-1 lg:order-2 bg-[#120e24]/30 border border-purple-950/20 rounded-2xl p-6 flex flex-col min-h-[550px] justify-center items-center relative">
            
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl w-full text-center mb-4">
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !story && (
              passcodeStatus.includes('✓') ? (
                <div className="text-center p-6 max-w-md space-y-4 border border-emerald-500/30 bg-emerald-950/10 rounded-2xl shadow-xl animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-xl">✓</div>
                  <h3 className="text-xl font-black text-emerald-400 tracking-wide">Vaše Premium členství je aktivní</h3>
                  <p className="text-purple-200 text-sm leading-relaxed px-2">Všechny funkce generátoru máte plně odemčené. Nastavte parametry v Kovárně Příběhů a nechte se unést magickým vyprávěním.</p>
                </div>
              ) : !freeTrialUsed ? (
                <div className="text-center p-6 max-w-md space-y-5 border border-purple-950/60 bg-[#120e24]/50 rounded-2xl shadow-xl animate-fadeIn">
                  <span className="text-4xl block">🎁</span>
                  <h3 className="text-lg font-black text-amber-400 tracking-wide">Vyzkoušejte si Noční Knihovnu zdarma</h3>
                  <p className="text-purple-200 text-sm leading-relaxed text-justify px-2">
                    Vyplňte jméno vašeho děťátka v levém panelu a kliknutím na tlačítko níže si **vygenerujte jeden plnohodnotný příběh úplně zdarma**. Uvidíte, jak magické příběhy umí náš StoryLab tvořit.
                  </p>
                  <p className="text-[11px] text-purple-400/70 italic">Pokud se vám pohádka bude líbit, můžete si aktivovat neomezené Premium za 75 Kč a odemknout si i kompletní písničky a omalovánky na hlavním webu.</p>
                </div>
              ) : (
                <div className="text-center p-6 max-w-md space-y-5 border border-purple-950/60 bg-[#120e24]/50 rounded-2xl shadow-xl animate-fadeIn">
                  <span className="text-4xl block filter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">🔒</span>
                  <h3 className="text-lg font-black text-amber-400 tracking-wide">Váš bezplatný pokus byl vyčerpán</h3>
                  <p className="text-purple-200 text-sm leading-relaxed text-justify px-2">
                    Doufáme, že se vám první pohádka líbila! Aktivací neomezeného Premium členství získáte **stálý přístup k tomuto generátoru**. Na hlavní doméně se vám navíc plně odemknou **všechny doprovodné nahrávky, říkadla a sady kreativních omalovánek**.
                  </p>
                  <div className="pt-2">
                    <a href="https://buy.stripe.com/8x2fZh8CZ2H2eD73aQ9IQ0q" onClick={openStripePopup} className="inline-block bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs px-6 py-3 rounded-xl transition shadow-lg uppercase">AKTIVOVAT PREMIUM ZA 75 KČ ➔</a>
                  </div>
                </div>
              )
            )}

            {isLoading && (
              <div className="text-center space-y-6">
                <div className="w-14 h-14 mx-auto rounded-full border-4 border-purple-950 border-t-emerald-400 animate-spin"></div>
                <p className="text-purple-200 font-medium text-lg animate-pulse">{currentLoadingText}</p>
              </div>
            )}

            {!isLoading && story && (
              <div className="w-full space-y-6 animate-fadeIn">
                {story.image && <img src={story.image} alt="Ilustrace" className="w-full h-56 object-cover rounded-xl border border-purple-950 shadow-md" />}
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-amber-400 leading-tight border-b border-purple-950/40 pb-2">{story.title}</h3>
                  <div className="text-purple-50/95 leading-relaxed text-base md:text-lg text-justify max-h-[420px] overflow-y-auto pr-3 space-y-4 whitespace-pre-line font-medium">{story.text}</div>
                </div>
                {story.text && (
                  <div className="pt-4 border-t border-purple-950/60 space-y-3">
                    <button onClick={handlePlayAudio} className="w-full py-3 bg-[#191433] border border-emerald-500/30 rounded-xl font-bold text-emerald-400 text-sm">{isPlaying ? '🛑 Zastavit čtení' : '🔊 Přečíst příběh nahlas'}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRAVÝ PANEL */}
          <div className="lg:col-span-3 order-3 space-y-6">
            <div className="bg-[#120e24] border border-purple-950/40 rounded-2xl p-4 shadow-xl flex flex-col max-h-[380px]">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3 border-b border-purple-950/50 pb-2">Moje Kovárna ({savedStories.length})</h3>
              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {loadingHistory ? <p className="text-[11px] text-purple-400/40 text-center py-4">Načítám příběhy...</p> : savedStories.length === 0 ? <p className="text-[11px] text-purple-400/40 text-center py-4 italic">V knihovně zatím nic není...</p> : (
                  <>
                    {freeStories.map((item) => (
                      <button key={item.id} type="button" onClick={() => handleSelectHistoryStory(item)} className={`w-full text-left p-2.5 rounded-xl border text-xs block truncate bg-[#191433] border-purple-920 text-purple-200`}>
                        <span className="font-bold block truncate text-xs text-emerald-400 mb-0.5">📖 {item.title}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-950/20 to-[#120e24] border border-purple-900/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-purple-900/60 border border-purple-700/50 text-[9px] text-purple-300 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Již brzy</div>
              <h3 className="text-base font-black text-purple-400 mb-1">Noční Knihovna VIP</h3>
              <p className="text-[11px] text-purple-400/60 leading-relaxed">Do budoucna pro vás chystáme ultra-realistické předčítání pohádek přes <strong className="text-purple-300">ElevenLabs</strong>, kompletní veřejnou knihovnu pro sdílení příběhů a prémiové rodinné účty.</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
