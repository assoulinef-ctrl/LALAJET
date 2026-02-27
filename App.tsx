import React, { useState, useEffect, useRef } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { CatalogManager } from './components/CatalogManager';
import { QuotePreview } from './components/QuotePreview';
import { ArchiveView } from './components/ArchiveView';
import { ClientManager } from './components/ClientManager';
import { Quote, Language, Currency, CompanyConfig, QuoteCard, Client } from './types';
import { LANGUAGES } from './constants';
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

const ensureId = (id?: string) => id && id.trim() ? id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2));
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

  const clientsSaveTimer = useRef<number | null>(null);
  const catalogSaveTimer = useRef<number | null>(null);

  const prevClientIds = useRef<Set<string>>(new Set());
  const prevCatalogIds = useRef<Set<string>>(new Set());

  // ✅ hashes pour upsert uniquement les changements
  const prevClientHash = useRef<Map<string, string>>(new Map());
  const prevCatalogHash = useRef<Map<string, string>>(new Map());

  // ---------------- SUPABASE FETCH (SOURCE OF TRUTH) ----------------
  const fetchFromSupabase = async () => {
    if (!sb) return;

    try {
      setDbStatus("Sync...");

      // CONFIG
      const { data: settingsData } = await sb
        .from('settings')
        .select('data')
        .eq('id', SETTINGS_ROW_ID)
        .maybeSingle();

      if (settingsData?.data) {
        setConfig(settingsData.data as CompanyConfig);
      }

      // CLIENTS
      const { data: clientsRows } = await sb
        .from('clients')
        .select('id, data')
        .order('updated_at', { ascending: false });

      const remoteClients: Client[] = (clientsRows || [])
        .map((r: any) => ({ ...(r.data || {}), id: r.id }))
        .filter((c: any) => c?.id);

      setClients(remoteClients);

      // baseline (évite re-sync immédiat)
      prevClientIds.current = new Set(remoteClients.map(c => c.id));
      prevClientHash.current = new Map(remoteClients.map(c => [c.id, JSON.stringify(c)]));

      // CATALOG
      const { data: catalogRows } = await sb
        .from('catalog_items')
        .select('id, data')
        .order('updated_at', { ascending: false });

      const remoteCatalog: QuoteCard[] = (catalogRows || [])
        .map((r: any) => ({ ...(r.data || {}), id: r.id }))
        .filter((it: any) => it?.id);

      setCatalog(remoteCatalog);

      prevCatalogIds.current = new Set(remoteCatalog.map((i: any) => i.id));
      prevCatalogHash.current = new Map(remoteCatalog.map((i: any) => [i.id, JSON.stringify(i)]));

      // QUOTES (ARCHIVES) ✅ IMPORTANT : ON REMPLACE (pas de merge)
      const { data: quoteRows } = await sb
        .from('quotes')
        .select('id, data')
        .order('updated_at', { ascending: false });

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

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    // ⚠️ ON NE CHARGE PLUS clients/catalog/archives depuis localStorage
    // (c'était la cause principale des données "fantômes" dans un autre navigateur)

    // (optionnel) config locale seulement
    const savedConfig = localStorage.getItem('lalajet_config');
    if (savedConfig) {
      try { setConfig(JSON.parse(savedConfig)); } catch {}
    }

    // Supabase initial sync
    if (sb) {
      fetchFromSupabase().finally(() => {
        initialLoadDone.current = true;
      });
    } else {
      initialLoadDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- LOCAL STORAGE SAVE (CONFIG ONLY) ----------------
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem('lalajet_config', JSON.stringify(config));
    } catch (e) {
      console.error("[LalaJet] LocalStorage error", e);
    }
  }, [config, isAuthenticated]);

  // ---------------- SUPABASE AUTO SAVE FOR SETTINGS (CONFIG) ----------------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (!initialLoadDone.current) return;

    const timer = window.setTimeout(async () => {
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
          setDbStatus("Config: OK");
        }
      } catch (e) {
        console.error("[LalaJet] Settings sync error:", e);
        setDbStatus("Config: ERROR");
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [config, isAuthenticated, sb]);

  // --------- SUPABASE AUTO SYNC FOR CLIENTS (ADD/EDIT/DELETE) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;
    if (!initialLoadDone.current) return;

    if (clientsSaveTimer.current) window.clearTimeout(clientsSaveTimer.current);

    clientsSaveTimer.current = window.setTimeout(async () => {
      try {
        const normalized = (clients || []).map(c => ({ ...c, id: ensureId(c.id) }));

        if (normalized.some((c, i) => c.id !== (clients[i]?.id))) {
          setClients(normalized);
          return;
        }

        const currentIds = new Set(normalized.map(c => c.id));
        const deletedIds = [...prevClientIds.current].filter(id => !currentIds.has(id));

        // ✅ Upsert uniquement ce qui change
        const toUpsert: Client[] = [];
        for (const c of normalized) {
          const h = JSON.stringify(c);
          const prev = prevClientHash.current.get(c.id);
          if (prev !== h) toUpsert.push(c);
        }

        if (toUpsert.length > 0) {
          await Promise.all(
            toUpsert.map(c =>
              sb.from('clients').upsert({
                id: c.id,
                data: c,
                updated_at: new Date().toISOString()
              })
            )
          );
        }

        if (deletedIds.length > 0) {
          await sb.from('clients').delete().in('id', deletedIds);
        }

        prevClientIds.current = currentIds;
        prevClientHash.current = new Map(normalized.map(c => [c.id, JSON.stringify(c)]));
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
        const normalized = (catalog || []).map(it => ({ ...(it as any), id: ensureId((it as any).id) })) as any[];

        if (normalized.some((it, i) => it.id !== (catalog[i] as any)?.id)) {
          setCatalog(normalized as any);
          return;
        }

        const currentIds = new Set(normalized.map(it => it.id));
        const deletedIds = [...prevCatalogIds.current].filter(id => !currentIds.has(id));

        const toUpsert: QuoteCard[] = [];
        for (const it of normalized) {
          const h = JSON.stringify(it);
          const prev = prevCatalogHash.current.get(it.id);
          if (prev !== h) toUpsert.push(it);
        }

        if (toUpsert.length > 0) {
          await Promise.all(
            toUpsert.map(it =>
              sb.from('catalog_items').upsert({
                id: (it as any).id,
                data: it,
                updated_at: new Date().toISOString()
              })
            )
          );
        }

        if (deletedIds.length > 0) {
          await sb.from('catalog_items').delete().in('id', deletedIds);
        }

        prevCatalogIds.current = currentIds;
        prevCatalogHash.current = new Map(normalized.map(it => [it.id, JSON.stringify(it)]));
      } catch (e) {
        console.error("[LalaJet] Catalog sync error:", e);
      }
    }, 650);

    return () => {
      if (catalogSaveTimer.current) window.clearTimeout(catalogSaveTimer.current);
    };
  }, [catalog, isAuthenticated, sb]);

  // --------- AUTO REFRESH (multi-navigateurs) ----------
  // ✅ pour refléter les suppressions faites ailleurs sans recharger
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sb) return;

    const interval = window.setInterval(() => {
      fetchFromSupabase().catch(() => {});
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, sb]);

  // ---------------- AUTH ----------------
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

  // ---------------- QUOTES ----------------
  const saveToArchive = async (quote: Quote) => {
    const q = safeJsonClone({ ...quote, updatedAt: new Date().toISOString() });

    // local
    setArchives(prev => {
      const filtered = prev.filter(p => p.id !== q.id);
      return [q, ...filtered];
    });

    // remote
    if (sb) {
      await sb.from('quotes').upsert({
        id: q.id,
        data: q,
        updated_at: new Date().toISOString()
      });
    }
  };

  const deleteQuote = async (quoteId: string) => {
    // local
    setArchives(prev => prev.filter(q => q.id !== quoteId));

    // remote
    if (sb) {
      await sb.from('quotes').delete().eq('id', quoteId);
    }

    // refresh pour l'autre navigateur + toi
    fetchFromSupabase().catch(() => {});
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

    setClients(prev => [newClient, ...prev]);

    if (sb) {
      await sb.from('clients').upsert({
        id: newClient.id,
        data: newClient,
        updated_at: new Date().toISOString()
      });
    }
  };

  // ---------------- UI ----------------
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
      {/* Top bar / nav */}
      {/* ⚠️ Je garde ton UI existante : adapte si besoin */}
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
          setClients={setClients}
        />
      )}

      {activeTab === 'config' && (
        <CatalogManager
          config={config}
          setConfig={setConfig}
          catalog={catalog}
          setCatalog={setCatalog}
        />
      )}
    </div>
  );
};

export default App;
