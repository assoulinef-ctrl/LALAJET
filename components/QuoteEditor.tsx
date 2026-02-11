import React, { useState, useEffect, useRef } from 'react';
import { Quote, Language, Currency, QuoteCard, Client, CompanyConfig } from '../types';

const MAJOR_AIRPORTS = [
  { name: "Paris Le Bourget, FR (LBG)", lat: 48.9694, lng: 2.4414 },
  { name: "Dubai International, AE (DXB)", lat: 25.2532, lng: 55.3657 },
  { name: "Dubai Al Maktoum, AE (DWC)", lat: 24.8962, lng: 55.1592 },
  { name: "London Farnborough, UK (FAB)", lat: 51.2758, lng: -0.7763 },
  { name: "Geneva Cointrin, CH (GVA)", lat: 46.2370, lng: 6.1091 },
  { name: "Nice Côte d'Azur, FR (NCE)", lat: 43.6653, lng: 7.2150 },
  { name: "New York Teterboro, US (TEB)", lat: 40.8501, lng: -74.0608 },
  { name: "Saint Tropez La Mole, FR (LTT)", lat: 43.2056, lng: 6.4819 },
  { name: "Olbia Costa Smeralda, IT (OLB)", lat: 40.8987, lng: 9.5176 },
  { name: "Cannes Mandelieu, FR (CEQ)", lat: 43.5422, lng: 6.9531 },
  { name: "Tel Aviv Ben Gurion, IL (TLV)", lat: 32.0055, lng: 34.8854 },
  { name: "Ibiza Airport, ES (IBZ)", lat: 38.8729, lng: 1.3731 }
];

const compressImage = (base64: string, maxWidth = 1000, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

interface QuoteEditorProps {
  quote: Quote;
  setQuote: React.Dispatch<React.SetStateAction<Quote>>;
  catalog: QuoteCard[];
  clients: Client[];
  config: CompanyConfig;
  createNewQuote: () => void;
}

export const QuoteEditor: React.FC<QuoteEditorProps> = ({ quote, setQuote, catalog, clients, config, createNewQuote }) => {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [showLocalOrigin, setShowLocalOrigin] = useState(false);
  const [showLocalDest, setShowLocalDest] = useState(false);
  const [showLocalOriginRet, setShowLocalOriginRet] = useState(false);
  const [showLocalDestRet, setShowLocalDestRet] = useState(false);
  const lang = quote.language;
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const originRetInputRef = useRef<HTMLInputElement>(null);
  const destRetInputRef = useRef<HTMLInputElement>(null);

  const updateQuote = (fields: Partial<Quote>) => setQuote(prev => ({ ...prev, ...fields }));
  const updateFlight = (fields: Partial<Quote['flightDetails']>) => setQuote(prev => ({ ...prev, flightDetails: { ...prev.flightDetails, ...fields }}));
  const updateReturnFlight = (fields: Partial<Quote['flightDetails']>) => setQuote(prev => ({ 
    ...prev, 
    returnFlightDetails: prev.returnFlightDetails ? { ...prev.returnFlightDetails, ...fields } : { ...fields } as any
  }));

  useEffect(() => {
    const apiKey = config.googlePlacesApiKey || config.googleMapsApiKey;
    if (!apiKey) return;

    const loadScript = () => {
      if ((window as any).google?.maps?.places) {
        initAutocomplete();
        return;
      }
      const existing = document.getElementById('google-maps-script');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      const google = (window as any).google;
      if (!google?.maps?.places) return;
      const options = { types: ['airport'], fields: ['name', 'geometry'] };

      if (originInputRef.current) {
        const originAutocomplete = new google.maps.places.Autocomplete(originInputRef.current, options);
        originAutocomplete.addListener('place_changed', () => {
          const place = originAutocomplete.getPlace();
          if (place.geometry) {
            updateFlight({ from: place.name, originLat: place.geometry.location.lat(), originLng: place.geometry.location.lng() });
            setShowLocalOrigin(false);
          }
        });
      }
      if (destInputRef.current) {
        const destAutocomplete = new google.maps.places.Autocomplete(destInputRef.current, options);
        destAutocomplete.addListener('place_changed', () => {
          const place = destAutocomplete.getPlace();
          if (place.geometry) {
            updateFlight({ to: place.name, destLat: place.geometry.location.lat(), destLng: place.geometry.location.lng() });
            setShowLocalDest(false);
          }
        });
      }
      if (originRetInputRef.current) {
        const originRetAutocomplete = new google.maps.places.Autocomplete(originRetInputRef.current, options);
        originRetAutocomplete.addListener('place_changed', () => {
          const place = originRetAutocomplete.getPlace();
          if (place.geometry) {
            updateReturnFlight({ from: place.name, originLat: place.geometry.location.lat(), originLng: place.geometry.location.lng() });
            setShowLocalOriginRet(false);
          }
        });
      }
      if (destRetInputRef.current) {
        const destRetAutocomplete = new google.maps.places.Autocomplete(destRetInputRef.current, options);
        destRetAutocomplete.addListener('place_changed', () => {
          const place = destRetAutocomplete.getPlace();
          if (place.geometry) {
            updateReturnFlight({ to: place.name, destLat: place.geometry.location.lat(), destLng: place.geometry.location.lng() });
            setShowLocalDestRet(false);
          }
        });
      }
    };
    loadScript();
  }, [config.googleMapsApiKey, config.googlePlacesApiKey, quote.isRoundTrip]);

  const selectLocalAirport = (airport: any, target: 'origin' | 'dest' | 'originRet' | 'destRet') => {
    if (target === 'origin') { updateFlight({ from: airport.name, originLat: airport.lat, originLng: airport.lng }); setShowLocalOrigin(false); }
    else if (target === 'dest') { updateFlight({ to: airport.name, destLat: airport.lat, destLng: airport.lng }); setShowLocalDest(false); }
    else if (target === 'originRet') { updateReturnFlight({ from: airport.name, originLat: airport.lat, originLng: airport.lng }); setShowLocalOriginRet(false); }
    else if (target === 'destRet') { updateReturnFlight({ to: airport.name, destLat: airport.lat, destLng: airport.lng }); setShowLocalDestRet(false); }
  };

  const selectClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      updateQuote({
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address || '',
        clientCountry: client.country || ''
      });
    }
  };

  const selectAgent = (agentId: string) => {
    const agent = (config.agents || []).find(a => a.id === agentId);
    if (agent) {
      updateQuote({
        agentName: agent.name,
        agentTitle: agent.title,
        agentEmail: agent.email,
        agentPhone: agent.phone
      });
    }
  };

  const importFromCatalog = (model: QuoteCard) => {
    const newCard = JSON.parse(JSON.stringify(model));
    newCard.id = 'q-' + Date.now();
    setQuote(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
    setIsCatalogOpen(false);
  };

  const handleImgUpload = (cardId: string, idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setQuote(prev => ({
          ...prev,
          cards: prev.cards.map(c => {
            if (c.id !== cardId) return c;
            const currentImages = Array.isArray(c.images) ? [...c.images] : ['', '', ''];
            while(currentImages.length < 3) currentImages.push('');
            currentImages[idx] = compressed;
            return { ...c, images: currentImages };
          })
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrencySymbol = (curr: Currency) => {
    if (curr === Currency.EUR) return '€';
    if (curr === Currency.USD) return '$';
    if (curr === Currency.AED) return 'AED';
    return '€';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
      <div className="lg:col-span-1 space-y-8 no-print">
        {/* Nouveau Devis Quick Action */}
        <button 
           onClick={(e) => { e.preventDefault(); e.stopPropagation(); createNewQuote(); }}
           className="w-full bg-[#E73188] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#E73188]/20 hover:scale-105 active:scale-95 transition relative z-30"
        >
          🚀 Nouveau Devis
        </button>

        {/* Client */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Client</h2>
             <select onChange={(e) => selectClient(e.target.value)} className="text-[9px] bg-slate-50 border-none rounded-lg p-1 font-bold text-[#E73188]">
               <option value="">Sélectionner</option>
               {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Nom" value={quote.clientName} onChange={(e) => updateQuote({clientName: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="email" placeholder="Email" value={quote.clientEmail} onChange={(e) => updateQuote({clientEmail: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="text" placeholder="Téléphone" value={quote.clientPhone} onChange={(e) => updateQuote({clientPhone: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="text" placeholder="Adresse" value={quote.clientAddress || ''} onChange={(e) => updateQuote({clientAddress: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold" />
            <input type="text" placeholder="Pays" value={quote.clientCountry || ''} onChange={(e) => updateQuote({clientCountry: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold" />
          </div>
        </section>

        {/* Commercial Agent */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Agent Commercial</h2>
            <select onChange={(e) => selectAgent(e.target.value)} className="text-[9px] bg-slate-50 border-none rounded-lg p-1 font-bold text-[#E73188]">
               <option value="">Sélection Rapide...</option>
               {(config.agents || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
             </select>
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Nom Commercial" value={quote.agentName} onChange={(e) => updateQuote({agentName: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="text" placeholder="Fonction" value={quote.agentTitle} onChange={(e) => updateQuote({agentTitle: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="email" placeholder="Email Direct" value={quote.agentEmail} onChange={(e) => updateQuote({agentEmail: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            <input type="text" placeholder="Ligne Directe" value={quote.agentPhone} onChange={(e) => updateQuote({agentPhone: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
          </div>
        </section>

        {/* Itinéraire Aller */}
        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Itinéraire Aller 🛫</h2>
            <div className="flex items-center gap-2">
              <label className="text-[8px] font-black uppercase text-slate-400">Aller/Retour</label>
              <input type="checkbox" checked={quote.isRoundTrip} onChange={(e) => updateQuote({ isRoundTrip: e.target.checked })} className="w-4 h-4 accent-[#E73188] cursor-pointer" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input ref={originInputRef} type="text" placeholder="Départ" value={quote.flightDetails.from} onFocus={() => setShowLocalOrigin(true)} onChange={(e) => updateFlight({from: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#d4af37]" />
              {showLocalOrigin && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border shadow-2xl rounded-xl max-h-40 overflow-y-auto">
                   {MAJOR_AIRPORTS.filter(a => a.name.toLowerCase().includes(quote.flightDetails.from.toLowerCase())).map(a => (
                     <button key={a.name} onClick={() => selectLocalAirport(a, 'origin')} className="w-full text-left p-3 text-[10px] font-bold hover:bg-slate-50 border-b">{a.name}</button>
                   ))}
                   <button onClick={() => setShowLocalOrigin(false)} className="w-full p-2 bg-slate-100 text-[8px] font-black uppercase">Fermer</button>
                </div>
              )}
            </div>
            <div className="relative">
              <input ref={destInputRef} type="text" placeholder="Arrivée" value={quote.flightDetails.to} onFocus={() => setShowLocalDest(true)} onChange={(e) => updateFlight({to: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#d4af37]" />
              {showLocalDest && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border shadow-2xl rounded-xl max-h-40 overflow-y-auto">
                   {MAJOR_AIRPORTS.filter(a => a.name.toLowerCase().includes(quote.flightDetails.to.toLowerCase())).map(a => (
                     <button key={a.name} onClick={() => selectLocalAirport(a, 'dest')} className="w-full text-left p-3 text-[10px] font-bold hover:bg-slate-50 border-b">{a.name}</button>
                   ))}
                   <button onClick={() => setShowLocalDest(false)} className="w-full p-2 bg-slate-100 text-[8px] font-black uppercase">Fermer</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Décollage</label>
                <input type="date" value={quote.flightDetails.date} onChange={(e) => updateFlight({date: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-[10px] font-bold w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Heure</label>
                <input type="time" value={quote.flightDetails.departureTime} onChange={(e) => updateFlight({departureTime: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-[10px] font-bold w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Pax</label>
                <input type="number" value={quote.flightDetails.pax} onChange={(e) => updateFlight({pax: parseInt(e.target.value)})} className="bg-slate-50 rounded-lg p-2 text-xs font-bold w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Temps Vol</label>
                <input type="text" placeholder="4h 30m" value={quote.flightDetails.duration} onChange={(e) => updateFlight({duration: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-xs font-bold w-full" />
              </div>
            </div>
          </div>
        </section>

        {quote.isRoundTrip && (
          <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b pb-4">Itinéraire Retour 🛬</h2>
            <div className="space-y-4">
              <div className="relative">
                <input ref={originRetInputRef} type="text" placeholder="Départ" value={quote.returnFlightDetails?.from} onFocus={() => setShowLocalOriginRet(true)} onChange={(e) => updateReturnFlight({from: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#d4af37]" />
                {showLocalOriginRet && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border shadow-2xl rounded-xl max-h-40 overflow-y-auto">
                    {MAJOR_AIRPORTS.filter(a => a.name.toLowerCase().includes(quote.returnFlightDetails?.from.toLowerCase() || '')).map(a => (
                      <button key={a.name} onClick={() => selectLocalAirport(a, 'originRet')} className="w-full text-left p-3 text-[10px] font-bold hover:bg-slate-50 border-b">{a.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input ref={destRetInputRef} type="text" placeholder="Arrivée" value={quote.returnFlightDetails?.to} onFocus={() => setShowLocalDestRet(true)} onChange={(e) => updateReturnFlight({to: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#d4af37]" />
                {showLocalDestRet && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border shadow-2xl rounded-xl max-h-40 overflow-y-auto">
                    {MAJOR_AIRPORTS.filter(a => a.name.toLowerCase().includes(quote.returnFlightDetails?.to.toLowerCase() || '')).map(a => (
                      <button key={a.name} onClick={() => selectLocalAirport(a, 'destRet')} className="w-full text-left p-3 text-[10px] font-bold hover:bg-slate-50 border-b">{a.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Décollage</label>
                  <input type="date" value={quote.returnFlightDetails?.date} onChange={(e) => updateReturnFlight({date: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-[10px] font-bold w-full" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Heure</label>
                  <input type="time" value={quote.returnFlightDetails?.departureTime} onChange={(e) => updateReturnFlight({departureTime: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-[10px] font-bold w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Pax</label>
                  <input type="number" value={quote.returnFlightDetails?.pax} onChange={(e) => updateReturnFlight({pax: parseInt(e.target.value)})} className="bg-slate-50 rounded-lg p-2 text-xs font-bold w-full" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Temps Vol</label>
                  <input type="text" placeholder="4h 30m" value={quote.returnFlightDetails?.duration} onChange={(e) => updateReturnFlight({duration: e.target.value})} className="bg-slate-50 rounded-lg p-2 text-xs font-bold w-full" />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b pb-4">Devise & Fiscalité ⚖️</h2>
          <div className="space-y-4">
             {/* Devise */}
             <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Devise du Devis</label>
                <select 
                  value={quote.currency} 
                  onChange={(e) => {
                    const newCurrency = e.target.value as Currency;
                    console.log("[Currency] selected:", newCurrency);
                    updateQuote({ currency: newCurrency });
                  }}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#E73188]"
                >
                  <option value={Currency.EUR}>Euro (€)</option>
                  <option value={Currency.USD}>Dollar ($)</option>
                  <option value={Currency.AED}>Dirham (AED)</option>
                </select>
             </div>

             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400">Appliquer TVA</label>
                <input type="checkbox" checked={quote.taxRate > 0} onChange={(e) => updateQuote({ taxRate: e.target.checked ? 5 : 0 })} className="w-5 h-5 accent-[#E73188]" />
             </div>
             {quote.taxRate >= 0 && (
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-slate-300 ml-1">Taux (%)</label>
                 <input type="number" step="0.1" value={quote.taxRate} onChange={(e) => updateQuote({ taxRate: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#E73188]" />
               </div>
             )}
          </div>
        </section>
      </div>

      <div className="lg:col-span-3 space-y-10">
        <div className="flex justify-between items-end">
          <h2 className="text-4xl font-serif italic text-slate-800">Builder <span className="text-[#d4af37]">LalaJet</span></h2>
          <button onClick={() => setIsCatalogOpen(!isCatalogOpen)} className="bg-white border-2 border-slate-100 px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-[#d4af37] transition-all">Importer Modèle</button>
        </div>

        <div className="space-y-8">
          {quote.cards.map((card, idx) => (
            <div key={card.id} className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-50 relative group transition-all">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuote(p => ({ ...p, cards: p.cards.filter(c => c.id !== card.id) }));
                }} 
                className="absolute top-8 right-10 text-slate-200 hover:text-red-500 text-3xl z-30 transition cursor-pointer"
                title="Supprimer cet article"
              >
                ×
              </button>
              <div className="flex gap-10">
                <div className="w-56 space-y-2 shrink-0">
                   {[0, 1, 2].map(i => (
                     <div key={i} className={`bg-slate-100 rounded-xl overflow-hidden relative ${i === 0 ? 'aspect-video' : 'aspect-square h-24 inline-block mr-2'}`}>
                        {card.images && card.images[i] && <img src={card.images[i]} className="w-full h-full object-cover" alt="" />}
                        <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition flex items-center justify-center cursor-pointer">
                             <input type="file" className="hidden" onChange={(e) => handleImgUpload(card.id, i, e)} />
                             <span className="text-white text-[8px] font-black uppercase">Modifier</span>
                        </label>
                     </div>
                   ))}
                </div>
                <div className="flex-1 space-y-4">
                  <input type="text" value={card.title[lang]} onChange={(e) => { const newC = [...quote.cards]; newC[idx].title[lang] = e.target.value; updateQuote({cards: newC}); }} className="w-full text-3xl font-serif italic border-none p-0 focus:ring-0 text-black font-bold" />
                  <textarea value={card.description[lang]} onChange={(e) => { const newC = [...quote.cards]; newC[idx].description[lang] = e.target.value; updateQuote({cards: newC}); }} className="w-full text-xs text-black border-none p-0 focus:ring-0 h-32 resize-none" />
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Prix Ferme ({getCurrencySymbol(quote.currency)}) :</span>
                    <input type="number" value={card.price} onChange={(e) => { const newC = [...quote.cards]; newC[idx].price = parseFloat(e.target.value); updateQuote({cards: newC}); }} className="bg-slate-50 rounded-xl p-3 font-black w-40 text-black border-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isCatalogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-12" onClick={() => setIsCatalogOpen(false)}>
           <div className="bg-white w-full max-w-4xl p-10 rounded-[3rem] shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-3xl font-serif italic mb-8">Sélectionner un modèle</h3>
              <div className="grid grid-cols-2 gap-6">
                 {catalog.map(model => (
                    <button key={model.id} onClick={() => importFromCatalog(model)} className="flex items-center gap-4 p-4 border rounded-2xl hover:border-[#d4af37] transition text-left">
                       <img src={model.images && model.images[0] ? model.images[0] : ''} className="w-20 h-20 rounded-xl object-cover" />
                       <div>
                          <p className="font-serif font-bold italic">{model.title[Language.FR]}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37]">{model.price.toLocaleString()} {getCurrencySymbol(quote.currency)}</p>
                       </div>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};