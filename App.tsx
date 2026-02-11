import React, { useState, useEffect, useRef } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { CatalogManager } from './components/CatalogManager';
import { QuotePreview } from './components/QuotePreview';
import { ArchiveView } from './components/ArchiveView';
import { ClientManager } from './components/ClientManager';
import { Quote, Language, Currency, CompanyConfig, QuoteCard, Client } from './types';
import { LANGUAGES } from './constants';
import { supabase } from './lib/supabase';

const APP_PASSWORD = "LALAJET2026";

const LALAJET_LOGO_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgNTAwIj4KICA8ZyBmaWxsPSIjRTczMTg4Ij4KICAgIDxwYXRoIGQ9Ik0xMjAgODBoMzh2MTYwaC0zOHpNMjAwIDgwaDM4djE2MGgtMzh6TTEyMCAyNjBoMzh2MTYwaC0zOHpNMjAwIDgwaDM4djE2MGgtMzh6TTEyMCAyNjBoMzh2MTYwaC0zOHpNMjAwIDI2MGgzOHYxNjBoLTM4eiIgLz4KICAgIDx0ZXh0IHg9IjEyMCIgeT0iNDkwIiBmb250LWZhbWlseT0iUGxheWZhaXIgRGlzcGxheSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC1zaXplPSI5MCIgZmlsbD0iI0U3MzE4OCI+amV0PC90ZXh0PgogIDwvZz4KICA8ZyBmaWxsPSIjZDRhZjM3Ij4KICAgIDxwYXRoIGQ9Ik0zNTAgODBjLTQwIDAtNzAgMzAtNzAgNzBzMzAgNzAgNzAgNzAgNzAtMzAgNzAtNzAtMzAtNzAtNzAtNzB6bTAgMTAwYy0xNyAwLTMwLTEzLTMwLTMwczEzLTMwIDMwLTMwIDMwIDEzIDMwIDEzIDMwIDEzIDMwLTMwIDMwek00MjAgMTYwczYwIDAgNjAgNjAtNjAgNjAtNjAgNjB6IiAvPgogIDwvZz4KPC9zdmc+";

/**
 * On autorise des champs "en plus" dans config (ex: googleApiKey)
 * pour ne rien casser même si types.ts ne le contient pas.
 */
type AppConfig = CompanyConfig & {
  googleApiKey?: string; // optionnel
};

const DEFAULT_CONFIG: AppConfig = {
  name: "LalaJet",
  logo: LALAJET_LOGO_BASE64,
  address: "Dubai Airport Freezone, Building 6EB, Office 250, Dubai, UAE",
  phone: "+971 4 123 4567",
  email: "booking@lalajet.com",
  website: "www.lalajet.com",
  legalDisclaimer: "LalaJet is a flight broker. All flights are operated by certified air carriers.",
  footerInfo: "Offer valid for 48 hours. Subject to availability and traffic rights.",
  primaryColor: "#d4af37",
  agents: [],
  googleApiKey: "" // si tu veux, tu peux la remplir dans Config plus tard
};

const createEmptyQuote = (): Quote => ({
  id: 'LJ-' + Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 9000 + 1000),
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  language: Language.FR,
  currency: Currency.EUR,
  flightDetails: {
    date: new Date().toISOString().split('T')[0],
    from: '',
    to: '',
    departureTime: '10:00',
    arrivalTime: '14:30',
    duration: '4h 30m',
    pax: 1,
    originLat: 48.9694,
    originLng: 2.4414,
    destLat: 25.2532,
    destLng: 55.3657,
    originCoords: { x: 0, y: 0 },
    destCoords: { x: 0, y: 0 }
  },
  isRoundTrip: false,
  returnFlightDetails: {
    date: new Date().toISOString().split('T')[0],
    from: '',
    to: '',
    departureTime: '18:00',
    arrivalTime: '22:30',
    duration: '4h 30m',
    pax: 1,
    originLat: 25.2532,
    originLng: 55.3657,
    destLat: 48.9694,
    destLng: 2.4414,
    originCoords: { x: 0, y: 0 },
    destCoords: { x: 0, y: 0 }
  },
  cards: [],
  taxRate: 0,
  status: 'DRAFT',
  createdAt: new Date().toISOString(),
  agentName: '',
  agentTitle: '',
  agentEmail: '',
  agentPhone: '',
});

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [dbStatus, setDbStatus] = useState<string>("");

  const [view, setView] = useState<'EDITOR' | 'PREVIEW' | 'ARCHIVE' | 'CATALOG' | 'CLIENTS'>('EDITOR');
  const [activeQuote, setActiveQuote] = useState<Quote>(createEmptyQuote());
  const [archives, setArchives] = useState<Quote[]>([]);
  const [catalog, setCatalog] = useState<QuoteCard[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // anti spam supabase (petit délai)
  const configSyncTimer = useRef<number | null>(null);
  const catalogSyncTimer = useRef<number | null>(null);

  // 1) Chargement initial localStorage + supabase
  useEffect(() => {
    if (localStorage.getItem("lalajet_auth") === "1") {
      setIsAuthenticated(true);
    }

    const savedConfig = localStorage.getItem('lalajet_config');
    const savedCatalog = localStorage.getItem('lalajet_catalog');
    const savedClients = localStorage.getItem('lalajet_clients');
    const savedArchives = localStorage.getItem('lalajet_archives');

    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedCatalog) setCatalog(JSON.parse(savedCatalog));

    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients);
        if (Array.isArray(parsed)) setClients(parsed);
      } catch (e) { console.error("Error loading clients", e); }
    }

    if (savedArchives) {
      try {
        const parsed = JSON.parse(savedArchives);
        if (Array.isArray(parsed)) setArchives(parsed);
      } catch (e) { console.error("Error loading archives", e); }
    }

    // Si Supabase est présent, on charge la vérité depuis Supabase
    if (supabase) {
      fetchFromSupabase();
    }
  }, []);

  // 2) Load depuis Supabase (quotes + clients + catalog + settings/config)
  const fetchFromSupabase = async () => {
    if (!supabase) return;
    const sb = supabase; // <-- ça règle TS ("possibly null")

    try {
      // A) Quotes
      const { data: quotesData, error: qErr } = await sb.from('quotes').select('data');
      if (!qErr && quotesData && quotesData.length > 0) {
        const remoteQuotes = quotesData.map(q => q.data as Quote);
        setArchives(prev => {
          const combined = Array.isArray(prev) ? [...prev] : [];
          remoteQuotes.forEach(rq => {
            if (!combined.find(lq => lq.id === rq.id)) combined.push(rq);
          });
          return combined;
        });
      }

      // B) Clients
      const { data: clientsData, error: cErr } = await sb.from('clients').select('data');
      if (!cErr && clientsData && clientsData.length > 0) {
        const remoteClients = clientsData.map(c => c.data as Client);
        setClients(prev => {
          const combined = Array.isArray(prev) ? [...prev] : [];
          remoteClients.forEach(rc => {
            if (!combined.find(lc => lc.id === rc.id)) combined.push(rc);
          });
          return combined;
        });
      }

      // C) Catalog items
      const { data: catData, error: catError } = await sb.from('catalog_items').select('data');
      if (catError) {
        console.error("[LalaJet] Catalog load error from Supabase:", catError.message);
      } else if (catData && catData.length > 0) {
        const remoteCat = catData.map(c => c.data as QuoteCard);
        setCatalog(remoteCat);
      }

      // D) SETTINGS / CONFIG (logo, couleurs, textes, googleApiKey, etc.)
      const { data: settingsData, error: sErr } = await sb
        .from('settings')
        .select('data')
        .eq('id', 'app')
        .maybeSingle();

      if (!sErr && settingsData && (settingsData as any).data) {
        const remoteConfig = (settingsData as any).data as AppConfig;
        if (remoteConfig && typeof remoteConfig === 'object') {
          setConfig(prev => ({ ...prev, ...remoteConfig }));
        }
      }
    } catch (err) {
      console.error("Supabase load error:", err);
    }
  };

  // 3) Sauvegarde locale automatique (localStorage)
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem('lalajet_config', JSON.stringify(config));
      localStorage.setItem('lalajet_catalog', JSON.stringify(catalog));
      localStorage.setItem('lalajet_clients', JSON.stringify(clients));
      localStorage.setItem('lalajet_archives', JSON.stringify(archives));
    } catch (e) {
      console.error("LocalStorage error", e);
    }
  }, [config, catalog, clients, archives, isAuthenticated]);

  // 4) Auto-sync CONFIG vers Supabase (logo/couleur/texte/clé google etc.)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;

    // debounce (évite d'écrire 200 fois)
    if (configSyncTimer.current) window.clearTimeout(configSyncTimer.current);

    configSyncTimer.current = window.setTimeout(async () => {
      try {
        const sb = supabase;
        if (!sb) return;

        await sb.from('settings').upsert({
          id: 'app',
          data: config,
          updated_at: new Date().toISOString()
        });

        // (optionnel) petit statut
        // setDbStatus("Config sauvegardée");
        // setTimeout(() => setDbStatus(""), 1500);
      } catch (e) {
        console.error("Supabase config sync error:", e);
      }
    }, 800);

    return () => {
      if (configSyncTimer.current) window.clearTimeout(configSyncTimer.current);
    };
  }, [config, isAuthenticated]);

  // 5) Auto-sync CATALOG vers Supabase (articles)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;

    if (catalogSyncTimer.current) window.clearTimeout(catalogSyncTimer.current);

    catalogSyncTimer.current = window.setTimeout(async () => {
      try {
        const sb = supabase;
        if (!sb) return;

        if (!catalog || catalog.length === 0) return;

        // upsert item par item
        const promises = catalog.map(item => {
          const itemId = (item as any).id || `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          return sb.from('catalog_items').upsert({
            id: itemId,
            data: { ...(item as any), id: itemId },
            updated_at: new Date().toISOString()
          });
        });

        await Promise.all(promises);
      } catch (e) {
        console.error("Supabase catalog sync error:", e);
      }
    }, 800);

    return () => {
      if (catalogSyncTimer.current) window.clearTimeout(catalogSyncTimer.current);
    };
  }, [catalog, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      localStorage.setItem("lalajet_auth", "1");
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Mot de passe incorrect");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("lalajet_auth");
    window.location.reload();
  };

  const resetActiveQuote = () => {
    if (confirm("Effacer tout le devis actuel pour en créer un nouveau ?")) {
      setActiveQuote(createEmptyQuote());
    }
  };

  const findOrCreateClientFromQuote = (quote: Quote): Client | null => {
    const qName = quote.clientName?.trim();
    const qEmail = quote.clientEmail?.trim();
    if (!qName && !qEmail) return null;

    const existing = clients.find(c =>
      (qEmail && c.email?.toLowerCase() === qEmail.toLowerCase()) ||
      (qName && c.name?.toLowerCase() === qName.toLowerCase())
    );

    if (existing) return existing;

    const newClient: Client = {
      id: 'cl-' + Date.now(),
      name: qName || (`Client ${quote.id}`),
      email: qEmail || '',
      phone: quote.clientPhone || '',
      address: (quote as any).clientAddress || '',
      country: (quote as any).clientCountry || '',
    };

    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const saveToArchive = async () => {
    setDbStatus("SAVE...");
    try {
      const client = findOrCreateClientFromQuote(activeQuote);

      // Local archives update
      setArchives(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const existingIdx = list.findIndex(a => a && a.id === activeQuote.id);
        if (existingIdx >= 0) {
          const newArchives = [...list];
          newArchives[existingIdx] = JSON.parse(JSON.stringify(activeQuote));
          return newArchives;
        }
        return [...list, { ...JSON.parse(JSON.stringify(activeQuote)), status: 'DRAFT' }];
      });

      // Supabase sync
      if (supabase) {
        const sb = supabase;
        if (!sb) {
          setDbStatus("Supabase OFF");
          return;
        }

        setDbStatus("Supabase SYNC...");

        // 1) Quote
        const { error: quoteError } = await sb.from('quotes').upsert({
          id: activeQuote.id,
          data: activeQuote,
          updated_at: new Date().toISOString()
        });

        // 2) Client
        if (client) {
          await sb.from('clients').upsert({
            id: client.id,
            data: client,
            updated_at: new Date().toISOString()
          });
        }

        // 3) Config (settings)
        await sb.from('settings').upsert({
          id: 'app',
          data: config,
          updated_at: new Date().toISOString()
        });

        // 4) Catalog (articles)
        if (catalog && catalog.length > 0) {
          const catPromises = catalog.map(item => {
            const itemId = (item as any).id || `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            return sb.from('catalog_items').upsert({
              id: itemId,
              data: { ...(item as any), id: itemId },
              updated_at: new Date().toISOString()
            });
          });
          await Promise.all(catPromises);
        }

        if (quoteError) {
          setDbStatus(`Supabase ERROR: ${quoteError.message}`);
        } else {
          setDbStatus("Supabase OK ✅");
        }
      } else {
        setDbStatus("Supabase OFF");
      }

      setTimeout(() => setDbStatus(""), 2000);
      alert("Sauvegardé ✅");
    } catch (err) {
      console.error("Save error", err);
      setDbStatus("Erreur");
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Supprimer ce devis définitivement ?')) return;

    setArchives(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));

    if (supabase) {
      const sb = supabase;
      if (sb) await sb.from('quotes').delete().eq('id', id);
    }
  };

  const toggleStatus = (id: string) => {
    setArchives(prev =>
      (Array.isArray(prev) ? prev : []).map(a =>
        a.id === id ? { ...a, status: a.status === 'ACCEPTED' ? 'DRAFT' : 'ACCEPTED' } : a
      )
    );
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <img src={LALAJET_LOGO_BASE64} className="h-20 w-auto" alt="LalaJet" />
            <div className="text-center">
              <h1 className="text-2xl font-serif font-black italic tracking-tight uppercase text-slate-900">Accès Réservé</h1>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d4af37] mt-1">LalaJet internal system</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Mot de passe</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-bold focus:border-[#E73188] outline-none transition"
                placeholder="••••••••"
              />
              {loginError && <p className="text-[10px] text-red-500 font-bold text-center mt-2 uppercase">{loginError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-[#E73188] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#E73188]/20 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              Se Connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // APP SCREEN
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#E73188]/10">
      <nav className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-[60] shadow-sm no-print">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('EDITOR')}>
            {config.logo && <img src={config.logo} className="h-10 w-auto object-contain" alt="LalaJet" />}
            <div className="flex flex-col">
              <span className="text-sm font-serif font-black italic tracking-tighter uppercase leading-none">LalaJet</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#d4af37] leading-none mt-1">Private Jet Broker</span>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'EDITOR', label: 'Éditeur', icon: '📝' },
              { id: 'ARCHIVE', label: 'Archives', icon: '📂' },
              { id: 'CLIENTS', label: 'Clients', icon: '👥' },
              { id: 'CATALOG', label: 'Config', icon: '⚙️' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setView(btn.id as any)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  view === btn.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <span>{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {view === 'EDITOR' && (
            <>
              {dbStatus && (
                <span className="text-[8px] font-black uppercase tracking-widest text-[#E73188] animate-pulse bg-[#E73188]/5 px-3 py-1 rounded-full">
                  {dbStatus}
                </span>
              )}
              <button
                onClick={resetActiveQuote}
                className="text-[#E73188] border border-[#E73188] text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-[#E73188] hover:text-white rounded-full transition-all"
              >
                Nouveau Devis
              </button>
              <button
                onClick={saveToArchive}
                className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-slate-50 rounded-full transition"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setView('PREVIEW')}
                className="bg-[#E73188] text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#E73188]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                Aperçu PDF
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </>
          )}

          {view === 'PREVIEW' && (
            <button
              onClick={() => setView('EDITOR')}
              className="bg-slate-900 text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all"
            >
              Retour Édition
            </button>
          )}

          <button
            onClick={handleLogout}
            className="ml-4 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 transition"
            title="Déconnexion"
          >
            Déconnexion 🚪
          </button>
        </div>
      </nav>

      <main className="relative">
        {view === 'EDITOR' && (
          <QuoteEditor
            quote={activeQuote}
            setQuote={setActiveQuote}
            catalog={catalog}
            clients={clients}
            config={config}
            createNewQuote={resetActiveQuote}
          />
        )}

        {view === 'PREVIEW' && (
          <QuotePreview
            quote={activeQuote}
            setQuote={setActiveQuote}
            config={config}
          />
        )}

        {view === 'ARCHIVE' && (
          <ArchiveView
            archives={archives}
            setActiveQuote={setActiveQuote}
            setView={setView}
            deleteQuote={deleteQuote}
            toggleStatus={toggleStatus}
          />
        )}

        {view === 'CATALOG' && (
          <CatalogManager
            config={config}
            setConfig={setConfig as any}
            catalog={catalog}
            setCatalog={setCatalog}
          />
        )}

        {view === 'CLIENTS' && (
          <ClientManager
            clients={clients}
            setClients={setClients}
          />
        )}
      </main>

      <div className="fixed bottom-10 right-10 flex flex-col gap-2 no-print z-50">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveQuote(p => ({ ...p, currency: Currency.EUR }))}
            className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-[10px] font-black hover:scale-110 transition ${
              activeQuote.currency === Currency.EUR ? 'border-[#d4af37]' : 'border-slate-100'
            }`}
          >
            €
          </button>
          <button
            onClick={() => setActiveQuote(p => ({ ...p, currency: Currency.USD }))}
            className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-[10px] font-black hover:scale-110 transition ${
              activeQuote.currency === Currency.USD ? 'border-[#d4af37]' : 'border-slate-100'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setActiveQuote(p => ({ ...p, currency: Currency.AED }))}
            className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-[8px] font-black hover:scale-110 transition ${
              activeQuote.currency === Currency.AED ? 'border-[#d4af37]' : 'border-slate-100'
            }`}
          >
            AED
          </button>
        </div>

        <div className="flex gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setActiveQuote(p => ({ ...p, language: l.code }))}
              className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-lg hover:scale-110 transition ${
                activeQuote.language === l.code ? 'border-[#E73188]' : 'border-slate-100'
              }`}
              title={l.name}
            >
              {l.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
