import React, { useState, useEffect } from 'react';
import { QuoteEditor } from './components/QuoteEditor';
import { CatalogManager } from './components/CatalogManager';
import { QuotePreview } from './components/QuotePreview';
import { ArchiveView } from './components/ArchiveView';
import { ClientManager } from './components/ClientManager';
import { Quote, Language, Currency, CompanyConfig, QuoteCard, Client } from './types';
import { LANGUAGES } from './constants';
import { supabase } from './lib/supabase';

const APP_PASSWORD = "LALAJET2026";

const LALAJET_LOGO_BASE64 = "data:image/svg+xml;base64,..."; // garde ton logo actuel ici

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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<'EDITOR' | 'PREVIEW' | 'ARCHIVE' | 'CATALOG' | 'CLIENTS'>('EDITOR');
  const [activeQuote, setActiveQuote] = useState<Quote>(createEmptyQuote());
  const [archives, setArchives] = useState<Quote[]>([]);
  const [catalog, setCatalog] = useState<QuoteCard[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState<CompanyConfig>(DEFAULT_CONFIG);

  // ==============================
  // LOAD FROM SUPABASE
  // ==============================

  useEffect(() => {
    if (localStorage.getItem("lalajet_auth") === "1") {
      setIsAuthenticated(true);
    }

    if (!supabase) return;

    const loadAll = async () => {

      // QUOTES
      const { data: quotes } = await supabase.from('quotes').select('data');
      if (quotes) setArchives(quotes.map(q => q.data));

      // CLIENTS
      const { data: clientsData } = await supabase.from('clients').select('data');
      if (clientsData) setClients(clientsData.map(c => c.data));

      // CATALOG
      const { data: catalogData } = await supabase.from('catalog_items').select('data');
      if (catalogData) setCatalog(catalogData.map(c => c.data));

      // SETTINGS
      const { data: settingsData } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'global')
        .single();

      if (settingsData?.data) setConfig(settingsData.data);
    };

    loadAll();
  }, []);

  // ==============================
  // SAVE EVERYTHING
  // ==============================

  const saveAll = async () => {
    if (!supabase) return;

    // SAVE QUOTE
    await supabase.from('quotes').upsert({
      id: activeQuote.id,
      data: activeQuote,
      updated_at: new Date().toISOString()
    });

    // SAVE CLIENT
    if (activeQuote.clientName) {
      const client: Client = {
        id: 'cl-' + Date.now(),
        name: activeQuote.clientName,
        email: activeQuote.clientEmail,
        phone: activeQuote.clientPhone
      };

      await supabase.from('clients').upsert({
        id: client.id,
        data: client,
        updated_at: new Date().toISOString()
      });
    }

    // SAVE CATALOG (1 ligne par article)
    for (const item of catalog) {
      await supabase.from('catalog_items').upsert({
        id: item.id,
        data: item,
        updated_at: new Date().toISOString()
      });
    }

    // SAVE SETTINGS
    await supabase.from('settings').upsert({
      id: 'global',
      data: config,
      updated_at: new Date().toISOString()
    });

    alert("Synchronisation complète effectuée.");
  };

  if (!isAuthenticated) {
    return (
      <div style={{padding:40}}>
        <button onClick={() => {
          localStorage.setItem("lalajet_auth","1");
          setIsAuthenticated(true);
        }}>
          LOGIN
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={saveAll}>SAUVEGARDER</button>
      <QuoteEditor
        quote={activeQuote}
        setQuote={setActiveQuote}
        catalog={catalog}
        clients={clients}
        config={config}
        createNewQuote={() => setActiveQuote(createEmptyQuote())}
      />
    </div>
  );
};

export default App;
