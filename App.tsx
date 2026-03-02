import React, { useState, useEffect, useRef } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { CatalogManager } from './components/CatalogManager';
import { QuotePreview } from './components/QuotePreview';
import { ArchiveView } from './components/ArchiveView';
import { ClientManager } from './components/ClientManager';
import { Quote, Language, Currency, CompanyConfig, QuoteCard, Client } from './types';
import { LANGUAGES } from './constants';
import { supabase } from './lib/supabase';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

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

/** Helpers "blindés" */
const safeJsonClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));
const ensureId = (id?: string) => id && id.trim().length > 0 ? id : `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const App: React.FC = () => {
  // Alias "type-safe": si on a vérifié sb, TS arrête d'hurler
  const sb = supabase;

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

  // timers / guards
  const settingsSaveTimer = useRef<number | null>(null);
  const clientsSaveTimer = useRef<number | null>(null);
  const catalogSaveTimer = useRef<number | null>(null);

  const initialLoadDone = useRef<boolean>(false);

  // For delete detection
  const prevClientIds = useRef<Set<string>>(new Set());
  const prevCatalogIds = useRef<Set<string>>(new Set());

  // ----------- LOAD (AUTH + CONFIG + DRAFT ONLY) -----------
// ⚠️ Source of truth = Supabase.
// On ne charge PLUS clients/catalog/archives depuis localStorage (sinon données “fantômes” entre navigateurs).
useEffect(() => {
  // auth (optionnel)
  const authFlag = localStorage.getItem('lalajet_auth');
  if (authFlag === 'true' || authFlag === '1') {
    setIsAuthenticated(true);
  }

  // config locale (optionnel)
  const savedConfig = localStorage.getItem('lalajet_config');
  if (savedConfig) {
    try { setConfig(JSON.parse(savedConfig)); } catch {}
  }

  // brouillon local (optionnel)
  const savedDraft = localStorage.getItem('lalajet_active_quote');
  if (savedDraft) {
    try { setActiveQuote(JSON.parse(savedDraft)); } catch {}
  }
}, []);

    // ---------------- SUPABASE FETCH (SOURCE OF TRUTH) ----------------
  const fetchFromSupabase = async () => {
    if (!sb) return;

    try {
      setDbStatus("Sync...");

      // 0) SETTINGS (CONFIG)
      const { data: settingsData, error: settingsErr } = await sb
        .from('settings')
        .select('data')
        .eq('id', SETTINGS_ROW_ID)
        .maybeSingle();

      if (!settingsErr && settingsData?.data) {
        setConfig(settingsData.data as CompanyConfig);
      }

      // 1) QUOTES (ARCHIVES) -> on remplace (pas de merge)
      const { data: quoteRows, error: quotesErr } = await sb
        .from('quotes')
        .select('id, data, updated_at')
        .order('updated_at', { ascending: false });

      if (!quotesErr) {
        const remoteQuotes: Quote[] = (quoteRows || [])
          .map((r: any) => ({ ...(r.data || {}), id: r.id }))
          .filter((q: any) => q?.id);

        setArchives(remoteQuotes);
      }

      // 2) CLIENTS -> on remplace
      const { data: clientsRows, error: clientsErr } = await sb
        .from('clients')
        .select('id, data, updated_at')
        .order('updated_at', { ascending: false });

      if (!clientsErr) {
        const remoteClients: Client[] = (clientsRows || [])
          .map((r: any) => ({ ...(r.data || {}), id: r.id }))
          .filter((c: any) => c?.id);

        setClients(remoteClients);

        // baseline pour éviter de re-upsert juste après un fetch
        prevClientIds.current = new Set(remoteClients.map(c => c.id));
        prevClientHash.current = new Map(remoteClients.map(c => [c.id, JSON.stringify(c)]));
      }

      // 3) CATALOG -> on remplace
      const { data: catalogRows, error: catalogErr } = await sb
        .from('catalog_items')
        .select('id, data, updated_at')
        .order('updated_at', { ascending: false });

      if (!catalogErr) {
        const remoteCatalog: QuoteCard[] = (catalogRows || [])
          .map((r: any) => ({ ...(r.data || {}), id: r.id }))
          .filter((it: any) => it?.id);

        setCatalog(remoteCatalog);

        prevCatalogIds.current = new Set(remoteCatalog.map((it: any) => it.id));
        prevCatalogHash.current = new Map(remoteCatalog.map((it: any) => [it.id, JSON.stringify(it)]));
      }

      setDbStatus("OK");
    } catch (e) {
      console.error("[LalaJet] fetchFromSupabase error:", e);
      setDbStatus("ERROR");
    }
  };

  // ----------- INITIAL SUPABASE LOAD AFTER LOGIN -----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (initialLoadDone.current) return;

    fetchFromSupabase()
      .catch(() => {})
      .finally(() => {
        initialLoadDone.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sb]);


// ---------- LOCAL STORAGE AUTO SAVE ----------
useEffect(() => {
  if (!isAuthenticated) return;
  try {
    // On garde uniquement la config en local (optionnel)
    localStorage.setItem('lalajet_config', JSON.stringify(config));
  } catch (e) {
    console.error("[LalaJet] LocalStorage error", e);
  }
}, [config, isAuthenticated]);

  // --------- SUPABASE AUTO SAVE FOR SETTINGS (CONFIG) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (!initialLoadDone.current) return;

    if (settingsSaveTimer.current) window.clearTimeout(settingsSaveTimer.current);

    settingsSaveTimer.current = window.setTimeout(async () => {
      try {
        setDbStatus("Config: sync...");
        const { error } = await sb
          .from('settings')
          .upsert({
            id: SETTINGS_ROW_ID,
            data: config,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error("[LalaJet] Settings upsert error:", error.message);
          setDbStatus("Config: ERROR");
        } else {
          setDbStatus("Config: saved ✅");
        }
        setTimeout(() => setDbStatus(""), 1800);
      } catch (e) {
        console.error("[LalaJet] Settings save crash:", e);
        setDbStatus("Config: ERROR");
        setTimeout(() => setDbStatus(""), 1800);
      }
    }, 700);

    return () => {
      if (settingsSaveTimer.current) window.clearTimeout(settingsSaveTimer.current);
    };
  }, [config, isAuthenticated, sb]);

  // --------- SUPABASE AUTO SYNC FOR CLIENTS (ADD/EDIT/DELETE) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (!initialLoadDone.current) return;

    if (clientsSaveTimer.current) window.clearTimeout(clientsSaveTimer.current);

    clientsSaveTimer.current = window.setTimeout(async () => {
      try {
        // normalize ids
        const normalized = (clients || []).map(c => ({ ...c, id: ensureId(c.id) }));
        if (normalized.some((c, i) => c.id !== (clients[i]?.id))) {
          setClients(normalized);
          return; // next effect will sync
        }

        // detect deletions
        const currentIds = new Set(normalized.map(c => c.id));
        const deletedIds = [...prevClientIds.current].filter(id => !currentIds.has(id));

        // upsert all (simple + safe)
        if (normalized.length > 0) {
          await Promise.all(
            normalized.map(c =>
              sb.from('clients').upsert({
                id: c.id,
                data: c,
                updated_at: new Date().toISOString()
              })
            )
          );
        }

        // delete removed
        if (deletedIds.length > 0) {
          await sb.from('clients').delete().in('id', deletedIds);
        }

        prevClientIds.current = currentIds;
      } catch (e) {
        console.error("[LalaJet] Clients sync error:", e);
      }
    }, 650);

    return () => {
      if (clientsSaveTimer.current) window.clearTimeout(clientsSaveTimer.current);
    };
  }, [clients, isAuthenticated, sb]);

  // --------- SUPABASE AUTO SYNC FOR CATALOG (ADD/EDIT/DELETE) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (!initialLoadDone.current) return;

    if (catalogSaveTimer.current) window.clearTimeout(catalogSaveTimer.current);

    catalogSaveTimer.current = window.setTimeout(async () => {
      try {
        // normalize ids
        const normalized = (catalog || []).map((it: any) => ({ ...it, id: ensureId(it.id) }));
        const changedId = normalized.some((it: any, i: number) => it.id !== (catalog[i] as any)?.id);
        if (changedId) {
          setCatalog(normalized);
          return; // next effect will sync
        }

        const currentIds = new Set(normalized.map((i: any) => i.id));
        const deletedIds = [...prevCatalogIds.current].filter(id => !currentIds.has(id));

        if (normalized.length > 0) {
          await Promise.all(
            normalized.map((item: any) =>
              sb.from('catalog_items').upsert({
                id: item.id,
                data: item,
                updated_at: new Date().toISOString()
              })
            )
          );
        }

        if (deletedIds.length > 0) {
          await sb.from('catalog_items').delete().in('id', deletedIds);
        }

        prevCatalogIds.current = currentIds;
      } catch (e) {
        console.error("[LalaJet] Catalog sync error:", e);
      }
    }, 650);

    return () => {
      if (catalogSaveTimer.current) window.clearTimeout(catalogSaveTimer.current);
    };
  }, [catalog, isAuthenticated, sb]);

  // --------- REALTIME SUBSCRIPTIONS (multi-session live updates) ----------
  useEffect(() => {
  // ---------- SUPABASE REALTIME SUBS (instant cross-browser sync) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;

    let fetchTimer: number | null = null;
    const scheduleFetch = () => {
      if (fetchTimer) window.clearTimeout(fetchTimer);
      fetchTimer = window.setTimeout(() => {
        fetchFromSupabase().catch(() => {});
      }, 300);
    };

    // 1 canal unique, 4 tables
    const channel = sb.channel('lalajet-sync');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog_items' }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, scheduleFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, scheduleFetch)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // petit refresh au moment où le realtime est prêt
          scheduleFetch();
        }
      });

    // Fallback: refresh toutes les 15s au cas où le realtime est bloqué
    const interval = window.setInterval(() => {
      fetchFromSupabase().catch(() => {});
    }, 15000);

    return () => {
      if (fetchTimer) window.clearTimeout(fetchTimer);
      window.clearInterval(interval);
      sb.removeChannel(channel);
    };
  }, [isAuthenticated, sb]);

  // --------- AUTH ----------
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

  // --------- QUOTE LOGIC ----------
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
          newArchives[existingIdx] = safeJsonClone(activeQuote);
          return newArchives;
        }
        return [...list, { ...safeJsonClone(activeQuote), status: 'DRAFT' }];
      });

      if (sb) {
        setDbStatus("Supabase: sync...");

        const { error: quoteError } = await sb.from('quotes').upsert({
          id: activeQuote.id,
          data: activeQuote,
          updated_at: new Date().toISOString()
        });

        if (client) {
          await sb.from('clients').upsert({
            id: client.id,
            data: client,
            updated_at: new Date().toISOString()
          });
        }

        if (quoteError) {
          console.error("[LalaJet] Quote upsert error:", quoteError.message);
          setDbStatus(`Supabase: ERROR (${quoteError.message})`);
        } else {
          setDbStatus("Supabase: OK ✅");
        }
      } else {
        setDbStatus("Supabase: OFF (env missing)");
      }

      setTimeout(() => setDbStatus(""), 2500);
      alert("Devis et données synchronisés.");
    } catch (err) {
      console.error("[LalaJet] Save error", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const deleteQuote = async (id: string) => {
    if (confirm('Supprimer ce devis définitivement ?')) {
      setArchives(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));
      if (sb) {
        await sb.from('quotes').delete().eq('id', id);
      }
    }
  };

  const toggleStatus = (id: string) => {
    setArchives(prev => (Array.isArray(prev) ? prev : []).map(a =>
      a.id === id ? { ...a, status: a.status === 'ACCEPTED' ? 'DRAFT' : 'ACCEPTED' } : a
    ));
  };

  // --------- UI ----------
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
                Sauvegarder Brouillon
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
