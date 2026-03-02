import React, { useState, useEffect, useRef } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { CatalogManager } from './components/CatalogManager';
import { QuotePreview } from './components/QuotePreview';
import { ArchiveView } from './components/ArchiveView';
import { ClientManager } from './components/ClientManager';
import { Quote, Language, Currency, CompanyConfig, QuoteCard, Client } from './types';
import { supabase } from './lib/supabase';

// ✅ Mot de passe depuis Vercel Env (Project Settings → Environment Variables)
// Ajoute VITE_APP_PASSWORD = tonMotDePasse
// (fallback si absent)
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "LALAJET2026";

const LALAJET_LOGO_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHp2ZXJzZ..."; // (inchangé chez toi)

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

const ensureId = (id?: string) =>
  id && id.trim()
    ? id
    : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2));

const safeJsonClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const createEmptyQuote = (): Quote => ({
  id: "LJ-" + Date.now().toString().slice(-4) + "-" + Math.floor(Math.random() * 9000 + 1000),
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  language: Language.FR,
  currency: Currency.EUR,
  flightDetails: {
    date: new Date().toISOString().split('T')[0],
    departure: "",
    arrival: "",
    passengers: 1,
    aircraftType: "",
    roundTrip: false
  },
  services: [],
  totals: {
    subtotal: 0,
    vat: 0,
    total: 0
  },
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const SETTINGS_ROW_ID = "config";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [activeTab, setActiveTab] = useState<'editor' | 'archives' | 'clients' | 'config'>('editor');

  const [config, setConfig] = useState<CompanyConfig>(DEFAULT_CONFIG);
  const [catalog, setCatalog] = useState<QuoteCard[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [archives, setArchives] = useState<Quote[]>([]);

  const [activeQuote, setActiveQuote] = useState<Quote>(() => createEmptyQuote());
  const [dbStatus, setDbStatus] = useState<string>("");

  const sb = supabase;
  const initialLoadDone = useRef(false);

  // =========================
  // SUPABASE FETCH (TRUTH)
  // =========================
  const fetchFromSupabase = async () => {
    if (!sb) return;

    try {
      setDbStatus("Sync...");

      // CONFIG
      const { data: settingsData, error: settingsErr } = await sb
        .from('settings')
        .select('data')
        .eq('id', SETTINGS_ROW_ID)
        .maybeSingle();

      if (settingsErr) console.warn("[LalaJet] settings fetch error:", settingsErr.message);
      if (settingsData?.data) setConfig(settingsData.data as CompanyConfig);

      // CLIENTS
      const { data: clientsRows, error: clientsErr } = await sb
        .from('clients')
        .select('id, data')
        .order('updated_at', { ascending: false });

      if (clientsErr) console.warn("[LalaJet] clients fetch error:", clientsErr.message);

      const remoteClients: Client[] = (clientsRows || [])
        .map((r: any) => ({ ...(r.data || {}), id: r.id }))
        .filter((c: any) => c?.id);

      setClients(remoteClients);

      // CATALOG
      const { data: catalogRows, error: catalogErr } = await sb
        .from('catalog_items')
        .select('id, data')
        .order('updated_at', { ascending: false });

      if (catalogErr) console.warn("[LalaJet] catalog fetch error:", catalogErr.message);

      const remoteCatalog: QuoteCard[] = (catalogRows || [])
        .map((r: any) => ({ ...(r.data || {}), id: r.id }))
        .filter((it: any) => it?.id);

      setCatalog(remoteCatalog);

      // QUOTES (ARCHIVES) ✅ ON REMPLACE (pas de merge)
      const { data: quoteRows, error: quotesErr } = await sb
        .from('quotes')
        .select('id, data')
        .order('updated_at', { ascending: false });

      if (quotesErr) console.warn("[LalaJet] quotes fetch error:", quotesErr.message);

      const remoteQuotes: Quote[] = (quoteRows || [])
        .map((r: any) => ({ ...(r.data || {}), id: r.id }))
        .filter((q: any) => q?.id);

      setArchives(remoteQuotes.map(q => ({ ...q })));

      setDbStatus("OK");
    } catch (e) {
      console.error("[LalaJet] fetchFromSupabase error:", e);
      setDbStatus("ERROR");
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    // OPTIONNEL : garder config en local (OK)
    const savedConfig = localStorage.getItem('lalajet_config');
    if (savedConfig) {
      try { setConfig(JSON.parse(savedConfig)); } catch {}
    }

    // On ne charge plus clients/catalog/archives en localStorage
    if (sb) {
      fetchFromSupabase().finally(() => {
        initialLoadDone.current = true;
      });
    } else {
      initialLoadDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // LOCAL STORAGE SAVE (CONFIG ONLY)
  // =========================
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem('lalajet_config', JSON.stringify(config));
    } catch (e) {
      console.error("[LalaJet] LocalStorage error", e);
    }
  }, [config, isAuthenticated]);

  // =========================
  // CONFIG -> SUPABASE (À CHAQUE MODIF)
  // =========================
  const setConfigAndSync: React.Dispatch<React.SetStateAction<CompanyConfig>> = async (next) => {
    if (!isAuthenticated || !sb || !initialLoadDone.current) {
      setConfig(next as any);
      return;
    }

    const newConfig = typeof next === 'function' ? (next as any)(config) : next;
    setConfig(newConfig);

    try {
      setDbStatus("Config: saving...");
      const { error } = await sb.from('settings').upsert({
        id: SETTINGS_ROW_ID,
        data: newConfig,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      await fetchFromSupabase();
      setDbStatus("Config: OK");
    } catch (e: any) {
      console.error("[LalaJet] Config save error:", e?.message || e);
      setDbStatus("Config: ERROR");
    }
  };

  // =========================
  // CLIENTS -> SUPABASE (À CHAQUE ACTION)
  // =========================
  const setClientsAndSync: React.Dispatch<React.SetStateAction<Client[]>> = async (next) => {
    if (!isAuthenticated || !sb || !initialLoadDone.current) {
      setClients(next as any);
      return;
    }

    const current = clients;
    const nextClientsRaw = typeof next === 'function' ? (next as any)(current) : next;

    // Normalise IDs
    const nextClients = (nextClientsRaw || []).map((c: Client) => ({ ...c, id: ensureId(c.id) }));
    setClients(nextClients);

    try {
      setDbStatus("Clients: saving...");

      const currentIds = new Set(current.map(c => c.id));
      const nextIds = new Set(nextClients.map(c => c.id));

      const deletedIds = [...currentIds].filter(id => !nextIds.has(id));
      const upserts = nextClients;

      if (upserts.length > 0) {
        // upsert un par un (simple, fiable)
        for (const c of upserts) {
          const { error } = await sb.from('clients').upsert({
            id: c.id,
            data: c,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
        }
      }

      if (deletedIds.length > 0) {
        const { error } = await sb.from('clients').delete().in('id', deletedIds);
        if (error) throw error;
      }

      await fetchFromSupabase();
      setDbStatus("Clients: OK");
    } catch (e: any) {
      console.error("[LalaJet] Clients sync error:", e?.message || e);
      setDbStatus("Clients: ERROR");
    }
  };

  // =========================
  // CATALOG -> SUPABASE (À CHAQUE ACTION)
  // =========================
  const setCatalogAndSync: React.Dispatch<React.SetStateAction<QuoteCard[]>> = async (next) => {
    if (!isAuthenticated || !sb || !initialLoadDone.current) {
      setCatalog(next as any);
      return;
    }

    const current = catalog;
    const nextCatalogRaw = typeof next === 'function' ? (next as any)(current) : next;

    const nextCatalog = (nextCatalogRaw || []).map((it: any) => ({ ...(it || {}), id: ensureId(it?.id) })) as QuoteCard[];
    setCatalog(nextCatalog);

    try {
      setDbStatus("Catalog: saving...");

      const currentIds = new Set((current || []).map((i: any) => i.id));
      const nextIds = new Set((nextCatalog || []).map((i: any) => i.id));

      const deletedIds = [...currentIds].filter(id => !nextIds.has(id));
      const upserts = nextCatalog;

      if (upserts.length > 0) {
        for (const it of upserts as any[]) {
          const { error } = await sb.from('catalog_items').upsert({
            id: it.id,
            data: it,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
        }
      }

      if (deletedIds.length > 0) {
        const { error } = await sb.from('catalog_items').delete().in('id', deletedIds);
        if (error) throw error;
      }

      await fetchFromSupabase();
      setDbStatus("Catalog: OK");
    } catch (e: any) {
      console.error("[LalaJet] Catalog sync error:", e?.message || e);
      setDbStatus("Catalog: ERROR");
    }
  };

  // =========================
  // AUTH
  // =========================
  const handleLogin = async () => {
    if (passwordInput === APP_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput("");
      await fetchFromSupabase();
      initialLoadDone.current = true;
    } else {
      alert("Mot de passe incorrect");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // =========================
  // QUOTES (DEVIS) -> SUPABASE
  // =========================
  const saveToArchive = async (quote: Quote) => {
    const q = safeJsonClone({ ...quote, updatedAt: new Date().toISOString() });

    // UI immédiate
    setArchives(prev => {
      const filtered = prev.filter(p => p.id !== q.id);
      return [q, ...filtered];
    });

    try {
      setDbStatus("Quotes: saving...");
      if (sb) {
        const { error } = await sb.from('quotes').upsert({
          id: q.id,
          data: q,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      await fetchFromSupabase();
      setDbStatus("Quotes: OK");
    } catch (e: any) {
      console.error("[LalaJet] Quote upsert error:", e?.message || e);
      setDbStatus("Quotes: ERROR");
    }
  };

  const deleteQuote = async (quoteId: string) => {
    // UI immédiate
    setArchives(prev => prev.filter(q => q.id !== quoteId));

    try {
      setDbStatus("Quotes: deleting...");
      if (sb) {
        const { error } = await sb.from('quotes').delete().eq('id', quoteId);
        if (error) throw error;
      }
      await fetchFromSupabase();
      setDbStatus("Quotes: OK");
    } catch (e: any) {
      console.error("[LalaJet] Quote delete error:", e?.message || e);
      setDbStatus("Quotes: ERROR");
    }
  };

  const toggleStatus = async (quoteId: string) => {
    const q = archives.find(a => a.id === quoteId);
    if (!q) return;
    const updated = { ...q, status: q.status === 'draft' ? 'sent' : 'draft', updatedAt: new Date().toISOString() };
    await saveToArchive(updated);
  };

  const resetActiveQuote = () => setActiveQuote(createEmptyQuote());

  const findOrCreateClientFromQuote = async (quote: Quote) => {
    if (!quote.clientEmail && !quote.clientName) return;

    const existing = clients.find(c =>
      (quote.clientEmail && c.email?.toLowerCase() === quote.clientEmail.toLowerCase()) ||
      (quote.clientName && c.name?.toLowerCase() === quote.clientName.toLowerCase())
    );

    if (existing) return;

    const newClient: Client = {
      id: ensureId(undefined),
      name: quote.clientName || "",
      email: quote.clientEmail || "",
      phone: quote.clientPhone || "",
      address: "",
      country: "",
      type: "PRIVATE"
    };

    try {
      setDbStatus("Clients: saving...");
      if (sb) {
        const { error } = await sb.from('clients').upsert({
          id: newClient.id,
          data: newClient,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      await fetchFromSupabase();
      setDbStatus("Clients: OK");
    } catch (e: any) {
      console.error("[LalaJet] client create error:", e?.message || e);
      setDbStatus("Clients: ERROR");
    }
  };

  // =========================
  // UI
  // =========================
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0f1a' }}>
        <div style={{ width: 360, padding: 24, borderRadius: 16, background: '#fff', textAlign: 'center' }}>
          <img src={LALAJET_LOGO_BASE64} alt="LalaJet" style={{ width: 80, marginBottom: 12 }} />
          <h2 style={{ margin: 0, marginBottom: 8 }}>ACCÈS RÉSERVÉ</h2>
          <p style={{ marginTop: 0, opacity: .7 }}>LalaJet internal system</p>

          <input
            type="password"
            value={passwordInput}
            placeholder="Mot de passe"
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #ddd', marginBottom: 12 }}
          />
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 0, background: '#ff2d86', color: '#fff', fontWeight: 700 }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => setActiveTab('editor')}>Éditeur</button>
        <button onClick={() => setActiveTab('archives')}>Archives</button>
        <button onClick={() => setActiveTab('clients')}>Clients</button>
        <button onClick={() => setActiveTab('config')}>Config</button>

        <div style={{ marginLeft: 'auto', opacity: .7, fontSize: 12 }}>
          DB: {dbStatus || "—"}
        </div>

        <button onClick={handleLogout}>Déconnexion</button>
      </div>

      {activeTab === 'editor' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <QuoteEditor
            quote={activeQuote}
            setQuote={setActiveQuote}
            catalog={catalog}
            clients={clients}
            config={config}
          />
          <QuotePreview
            quote={activeQuote}
            config={config}
          />
        </div>
      )}

      {activeTab === 'archives' && (
        <ArchiveView
          archives={archives}
          onOpen={(q) => { setActiveQuote(q); setActiveTab('editor'); }}
          onDelete={deleteQuote}
          onToggleStatus={toggleStatus}
        />
      )}

      {activeTab === 'clients' && (
        <ClientManager
          clients={clients}
          setClients={setClientsAndSync}
        />
      )}

      {activeTab === 'config' && (
        <CatalogManager
          config={config}
          setConfig={setConfigAndSync}
          catalog={catalog}
          setCatalog={setCatalogAndSync}
        />
      )}
    </div>
  );
};

export default App;
