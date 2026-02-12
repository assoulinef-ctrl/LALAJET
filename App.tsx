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

const DEFAULT_CONFIG: CompanyConfig = {
  name: "LalaJet",
  logo: LALAJET_LOGO_BASE64,
  address: "Dubai Airport Freezone, Building 6EB, Office 250, Dubai, UAE",
  phone: "+971 4 123 4567",
  email: "booking@lalajet.com",
  website: "www.lalajet.com",
  legalDisclaimer: "LalaJet is a flight broker. All flights are operated by certified air carriers.",
  footerInfo: "Offer valid for 48 hours. Subject to availability and traffic rights.",
  primaryColor: "#d4af37",
  agents: []
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

const SETTINGS_ROW_ID = "main";

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
  const [config, setConfig] = useState<CompanyConfig>(DEFAULT_CONFIG);

  const initialLoadDone = useRef<boolean>(false);

  // refs pour détecter ce qui a été supprimé (pour delete en DB)
  const prevClientsRef = useRef<Client[]>([]);
  const prevCatalogRef = useRef<QuoteCard[]>([]);
  const prevArchivesRef = useRef<Quote[]>([]);

  // debounce timers
  const clientsSyncTimer = useRef<number | null>(null);
  const catalogSyncTimer = useRef<number | null>(null);
  const quotesSyncTimer = useRef<number | null>(null);
  const settingsSyncTimer = useRef<number | null>(null);

  // -------------------- LOAD LOCAL + SUPABASE --------------------
  useEffect(() => {
    if (localStorage.getItem("lalajet_auth") === "1") {
      setIsAuthenticated(true);
    }

    const savedConfig = localStorage.getItem('lalajet_config');
    const savedCatalog = localStorage.getItem('lalajet_catalog');
    const savedClients = localStorage.getItem('lalajet_clients');
    const savedArchives = localStorage.getItem('lalajet_archives');

    if (savedConfig) { try { setConfig(JSON.parse(savedConfig)); } catch {} }
    if (savedCatalog) { try { setCatalog(JSON.parse(savedCatalog)); } catch {} }
    if (savedClients) { try { const p = JSON.parse(savedClients); if (Array.isArray(p)) setClients(p); } catch {} }
    if (savedArchives) { try { const p = JSON.parse(savedArchives); if (Array.isArray(p)) setArchives(p); } catch {} }

    const load = async () => {
      if (!supabase) {
        initialLoadDone.current = true;
        return;
      }

      try {
        // SETTINGS
        const { data: settingsData } = await supabase
          .from('settings')
          .select('data')
          .eq('id', SETTINGS_ROW_ID)
          .maybeSingle();

        if (settingsData?.data) setConfig(settingsData.data as CompanyConfig);

        // QUOTES
        const { data: quotesData } = await supabase.from('quotes').select('data');
        if (quotesData?.length) {
          const remote = quotesData.map(q => q.data as Quote);
          setArchives(remote);
        }

        // CLIENTS
        const { data: clientsData } = await supabase.from('clients').select('data');
        if (clientsData?.length) {
          const remote = clientsData.map(c => c.data as Client);
          setClients(remote);
        }

        // CATALOG
        const { data: catData } = await supabase.from('catalog_items').select('data');
        if (catData?.length) {
          const remote = catData.map(c => c.data as QuoteCard);
          setCatalog(remote);
        }
      } catch (e) {
        console.error("Supabase initial load error:", e);
      } finally {
        initialLoadDone.current = true;
      }
    };

    load();
  }, []);

  // -------------------- REALTIME (MULTI-SESSION) --------------------
  useEffect(() => {
    if (!supabase) return;
    if (!isAuthenticated) return;
    if (!initialLoadDone.current) return;

    const channel = supabase.channel('lalajet-realtime-all');

    // CLIENTS
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients' },
      (payload: any) => {
        const newRow = payload.new?.data as Client | undefined;
        const oldRow = payload.old?.data as Client | undefined;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (!newRow?.id) return;
          setClients(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex(c => c.id === newRow.id);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = newRow;
              return copy;
            }
            return [...list, newRow];
          });
        }

        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id || oldRow?.id;
          if (!id) return;
          setClients(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== id));
        }
      }
    );

    // CATALOG
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'catalog_items' },
      (payload: any) => {
        const newRow = payload.new?.data as QuoteCard | undefined;
        const oldRow = payload.old?.data as QuoteCard | undefined;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (!newRow?.id) return;
          setCatalog(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex(i => i.id === newRow.id);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = newRow;
              return copy;
            }
            return [...list, newRow];
          });
        }

        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id || oldRow?.id;
          if (!id) return;
          setCatalog(prev => (Array.isArray(prev) ? prev : []).filter(i => i.id !== id));
        }
      }
    );

    // QUOTES
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quotes' },
      (payload: any) => {
        const newRow = payload.new?.data as Quote | undefined;
        const oldRow = payload.old?.data as Quote | undefined;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (!newRow?.id) return;
          setArchives(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const idx = list.findIndex(q => q.id === newRow.id);
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = newRow;
              return copy;
            }
            return [...list, newRow];
          });
        }

        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id || oldRow?.id;
          if (!id) return;
          setArchives(prev => (Array.isArray(prev) ? prev : []).filter(q => q.id !== id));
        }
      }
    );

    channel.subscribe((status) => {
      // tu peux laisser silencieux
      // console.log("Realtime:", status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // -------------------- LOCAL STORAGE AUTO SAVE --------------------
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

  // -------------------- SETTINGS AUTO SAVE (CONFIG) --------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;
    if (!initialLoadDone.current) return;

    if (settingsSyncTimer.current) window.clearTimeout(settingsSyncTimer.current);

    settingsSyncTimer.current = window.setTimeout(async () => {
      try {
        setDbStatus("Config: sync...");
        const { error } = await supabase
          .from('settings')
          .upsert({
            id: SETTINGS_ROW_ID,
            data: config,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error("Settings upsert error:", error.message);
          setDbStatus("Config: ERROR");
        } else {
          setDbStatus("Config: saved ✅");
        }
        setTimeout(() => setDbStatus(""), 2500);
      } catch (e) {
        console.error("Settings save crash:", e);
        setDbStatus("Config: ERROR");
        setTimeout(() => setDbStatus(""), 2500);
      }
    }, 600);

    return () => {
      if (settingsSyncTimer.current) window.clearTimeout(settingsSyncTimer.current);
    };
  }, [config, isAuthenticated]);

  // -------------------- CLIENTS AUTO SYNC (ADD/UPDATE/DELETE) --------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;
    if (!initialLoadDone.current) return;

    if (clientsSyncTimer.current) window.clearTimeout(clientsSyncTimer.current);

    clientsSyncTimer.current = window.setTimeout(async () => {
      try {
        const prev = prevClientsRef.current || [];
        const curr = Array.isArray(clients) ? clients : [];

        // détecte les supprimés
        const prevIds = new Set(prev.map(c => c.id));
        const currIds = new Set(curr.map(c => c.id));
        const removed = [...prevIds].filter(id => !currIds.has(id));

        // delete en DB pour ne plus ré-apparaître ailleurs
        for (const id of removed) {
          await supabase.from('clients').delete().eq('id', id);
        }

        // upsert tout (simple et robuste)
        if (curr.length > 0) {
          await supabase.from('clients').upsert(
            curr.map(c => ({
              id: c.id,
              data: c,
              updated_at: new Date().toISOString()
            }))
          );
        }

        prevClientsRef.current = curr;
      } catch (e) {
        console.error("Clients sync error:", e);
      }
    }, 500);

    return () => {
      if (clientsSyncTimer.current) window.clearTimeout(clientsSyncTimer.current);
    };
  }, [clients, isAuthenticated]);

  // -------------------- CATALOG AUTO SYNC (ADD/UPDATE/DELETE) --------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;
    if (!initialLoadDone.current) return;

    if (catalogSyncTimer.current) window.clearTimeout(catalogSyncTimer.current);

    catalogSyncTimer.current = window.setTimeout(async () => {
      try {
        const prev = prevCatalogRef.current || [];
        const curr = Array.isArray(catalog) ? catalog : [];

        const prevIds = new Set(prev.map(i => i.id));
        const currIds = new Set(curr.map(i => i.id));
        const removed = [...prevIds].filter(id => !currIds.has(id));

        for (const id of removed) {
          await supabase.from('catalog_items').delete().eq('id', id);
        }

        if (curr.length > 0) {
          await supabase.from('catalog_items').upsert(
            curr.map(i => ({
              id: i.id,
              data: i,
              updated_at: new Date().toISOString()
            }))
          );
        }

        prevCatalogRef.current = curr;
      } catch (e) {
        console.error("Catalog sync error:", e);
      }
    }, 500);

    return () => {
      if (catalogSyncTimer.current) window.clearTimeout(catalogSyncTimer.current);
    };
  }, [catalog, isAuthenticated]);

  // -------------------- QUOTES AUTO SYNC (DELETE + UPDATE) --------------------
  // (Ça évite qu'un devis supprimé dans une session revienne dans l'autre)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!supabase) return;
    if (!initialLoadDone.current) return;

    if (quotesSyncTimer.current) window.clearTimeout(quotesSyncTimer.current);

    quotesSyncTimer.current = window.setTimeout(async () => {
      try {
        const prev = prevArchivesRef.current || [];
        const curr = Array.isArray(archives) ? archives : [];

        const prevIds = new Set(prev.map(q => q.id));
        const currIds = new Set(curr.map(q => q.id));
        const removed = [...prevIds].filter(id => !currIds.has(id));

        for (const id of removed) {
          await supabase.from('quotes').delete().eq('id', id);
        }

        // on upsert ce que tu as en local (robuste)
        if (curr.length > 0) {
          await supabase.from('quotes').upsert(
            curr.map(q => ({
              id: q.id,
              data: q,
              updated_at: new Date().toISOString()
            }))
          );
        }

        prevArchivesRef.current = curr;
      } catch (e) {
        console.error("Quotes sync error:", e);
      }
    }, 700);

    return () => {
      if (quotesSyncTimer.current) window.clearTimeout(quotesSyncTimer.current);
    };
  }, [archives, isAuthenticated]);

  // -------------------- AUTH --------------------
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
    try {
      const client = findOrCreateClientFromQuote(activeQuote);

      setArchives(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const existingIdx = list.findIndex(a => a && a.id === activeQuote.id);
        if (existingIdx >= 0) {
          const newArchives = [...list];
          newArchives[existingIdx] = JSON.parse(JSON.stringify(activeQuote));
          return newArchives;
        } else {
          return [...list, { ...JSON.parse(JSON.stringify(activeQuote)), status: 'DRAFT' }];
        }
      });

      // sync immédiate (optionnel) -> mais l’auto-sync s’occupe déjà du reste
      if (supabase) {
        setDbStatus("Supabase: sync...");
        await supabase.from('quotes').upsert({
          id: activeQuote.id,
          data: activeQuote,
          updated_at: new Date().toISOString()
        });

        if (client) {
          await supabase.from('clients').upsert({
            id: client.id,
            data: client,
            updated_at: new Date().toISOString()
          });
        }

        setDbStatus("Supabase: OK ✅");
      } else {
        setDbStatus("Supabase: OFF");
      }

      setTimeout(() => setDbStatus(""), 2500);
      alert("Devis et données synchronisés.");
    } catch (err) {
      console.error("Save error", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const deleteQuote = async (id: string) => {
    if (confirm('Supprimer ce devis définitivement ?')) {
      setArchives(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));
      // la suppression DB sera faite par l’auto-sync (et en plus on peut forcer ici)
      if (supabase) {
        await supabase.from('quotes').delete().eq('id', id);
      }
    }
  };

  const toggleStatus = (id: string) => {
    setArchives(prev => (Array.isArray(prev) ? prev : []).map(a =>
      a.id === id ? { ...a, status: a.status === 'ACCEPTED' ? 'DRAFT' : 'ACCEPTED' } : a
    ));
  };

  // -------------------- UI --------------------
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
          {dbStatus && (
            <span className="text-[8px] font-black uppercase tracking-widest text-[#E73188] animate-pulse bg-[#E73188]/5 px-3 py-1 rounded-full">
              {dbStatus}
            </span>
          )}

          {view === 'EDITOR' && (
            <>
              <button onClick={resetActiveQuote} className="text-[#E73188] border border-[#E73188] text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-[#E73188] hover:text-white rounded-full transition-all">
                Nouveau Devis
              </button>
              <button onClick={saveToArchive} className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-slate-50 rounded-full transition">
                Sauvegarder Brouillon
              </button>
              <button
                onClick={() => setView('PREVIEW')}
                className="bg-[#E73188] text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#E73188]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                Aperçu PDF
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
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
            setConfig={setConfig}
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
          >€</button>
          <button
            onClick={() => setActiveQuote(p => ({ ...p, currency: Currency.USD }))}
            className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-[10px] font-black hover:scale-110 transition ${
              activeQuote.currency === Currency.USD ? 'border-[#d4af37]' : 'border-slate-100'
            }`}
          >$</button>
          <button
            onClick={() => setActiveQuote(p => ({ ...p, currency: Currency.AED }))}
            className={`w-10 h-10 rounded-full bg-white shadow-xl border-2 flex items-center justify-center text-[8px] font-black hover:scale-110 transition ${
              activeQuote.currency === Currency.AED ? 'border-[#d4af37]' : 'border-slate-100'
            }`}
          >AED</button>
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
