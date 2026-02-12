import React, { useState } from 'react';
import { CompanyConfig, QuoteCard, Language, Agent } from '../types';
import { LANGUAGES } from '../constants';
import { supabase } from '../lib/supabase';

// Utilitaire de compression d'image
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

interface CatalogManagerProps {
  config: CompanyConfig;
  setConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;
  catalog: QuoteCard[];
  setCatalog: React.Dispatch<React.SetStateAction<QuoteCard[]>>;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ config, setConfig, catalog, setCatalog }) => {
  const [tab, setTab] = useState<'BRANDING' | 'CATALOG'>('BRANDING');
  const [editingLang, setEditingLang] = useState<Language>(Language.FR);

  const addModel = () => {
    const newModel: QuoteCard = {
      id: 'mod-' + Date.now(),
      type: 'AIRCRAFT',
      title: {
        [Language.FR]: 'Nouveau Modèle',
        [Language.EN]: '',
        [Language.DE]: '',
        [Language.IT]: '',
        [Language.ES]: '',
        [Language.RU]: '',
        [Language.HU]: '',
        [Language.PL]: ''
      },
      description: {
        [Language.FR]: '',
        [Language.EN]: '',
        [Language.DE]: '',
        [Language.IT]: '',
        [Language.ES]: '',
        [Language.RU]: '',
        [Language.HU]: '',
        [Language.PL]: ''
      },
      images: ['', '', ''],
      price: 0,
      isOptional: false,
      quantity: 1
    };
    setCatalog([...catalog, newModel]);
  };

  const updateModel = (idx: number, fields: Partial<QuoteCard>) => {
    const newCat = [...catalog];
    newCat[idx] = { ...newCat[idx], ...fields };
    setCatalog(newCat);
  };

  // ✅ FIX IMPORTANT : delete dans Supabase + delete local
  const deleteModel = async (id: string) => {
    if (!confirm("Supprimer ce modèle du catalogue ?")) return;

    // 1) Optimistic UI : on enlève tout de suite à l’écran
    setCatalog(prev => prev.filter(m => m.id !== id));

    // 2) Supabase : on supprime la ligne en DB (sinon l’autre session le récupère)
    try {
      if (!supabase) {
        console.warn('[LalaJet] Supabase OFF: delete catalog_item skipped');
        return;
      }

      const { error } = await supabase.from('catalog_items').delete().eq('id', id);

      if (error) {
        console.error('[LalaJet] Supabase delete catalog_item error:', error.message);

        // rollback simple (on remet l’item si tu veux être safe)
        // -> on le remet uniquement si on le retrouve dans le vieux catalog
        const removed = catalog.find(m => m.id === id);
        if (removed) {
          setCatalog(prev => {
            if (prev.some(x => x.id === id)) return prev;
            return [...prev, removed];
          });
        }

        alert("Erreur Supabase: suppression non enregistrée. Réessaie.");
      }
    } catch (e) {
      console.error('[LalaJet] Supabase delete crash:', e);
      alert("Crash lors de la suppression (Supabase). Réessaie.");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 500); // Logo small size
        setConfig(prev => ({ ...prev, logo: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelImgUpload = (idx: number, imgIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        const newCat = [...catalog];
        const newImgs = [...newCat[idx].images];
        newImgs[imgIdx] = compressed;
        newCat[idx].images = newImgs;
        setCatalog(newCat);
      };
      reader.readAsDataURL(file);
    }
  };

  const addAgent = () => {
    const newAgent: Agent = {
      id: 'ag-' + Date.now(),
      name: '',
      title: 'Commercial',
      email: '',
      phone: ''
    };
    setConfig(prev => ({ ...prev, agents: [...(prev.agents || []), newAgent] }));
  };

  const updateAgent = (id: string, fields: Partial<Agent>) => {
    setConfig(prev => ({
      ...prev,
      agents: (prev.agents || []).map(a => a.id === id ? { ...a, ...fields } : a)
    }));
  };

  const deleteAgent = (id: string) => {
    if (confirm("Supprimer ce commercial ?")) {
      setConfig(prev => ({
        ...prev,
        agents: (prev.agents || []).filter(a => a.id !== id)
      }));
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex gap-4 bg-white p-2 rounded-2xl shadow-sm border w-fit no-print">
        <button
          onClick={() => setTab('BRANDING')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${tab === 'BRANDING' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Société & Branding
        </button>
        <button
          onClick={() => setTab('CATALOG')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${tab === 'CATALOG' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          Catalogue Master
        </button>
      </div>

      {tab === 'BRANDING' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100 space-y-8">
              <h3 className="text-2xl font-serif italic text-slate-800 border-l-8 pl-6" style={{ borderColor: config.primaryColor }}>
                Identité Visuelle
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-3">Logo de la Marque</label>
                  <div className="mt-4 p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex items-center justify-center bg-slate-50 relative group overflow-hidden">
                    {config.logo ? (
                      <img src={config.logo} className="h-32 w-auto object-contain transition group-hover:scale-105" alt="Logo" />
                    ) : (
                      <span className="text-slate-300 text-[10px] font-black uppercase">Importer Logo</span>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer">
                      <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                      <svg className="w-8 h-8 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-5-7l-5-5m0 0l-5 5m5-5v12" />
                      </svg>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Modifier le Logo</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-3">Couleur Signature</label>
                  <div className="flex gap-4">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="h-16 w-24 cursor-pointer rounded-2xl border-none p-0 overflow-hidden"
                    />
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="flex-1 bg-slate-50 rounded-2xl px-6 font-black uppercase text-sm border-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Mentions Légales (Gauche)</label>
                    <textarea
                      value={config.legalDisclaimer}
                      onChange={(e) => setConfig({ ...config, legalDisclaimer: e.target.value })}
                      className="w-full bg-slate-50 rounded-2xl p-4 text-xs h-24 border-none resize-none"
                      placeholder="Ex: Broker de vols, transporteurs certifiés..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-2xl font-serif italic text-slate-800">Coordonnées Légales</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Google Maps API</label>
                  <input
                    type="text"
                    placeholder="Clé API"
                    value={(config as any).googleMapsApiKey || ''}
                    onChange={(e) => setConfig({ ...(config as any), googleMapsApiKey: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Adresse Siège</label>
                  <input
                    type="text"
                    placeholder="Dubai Airport..."
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Téléphone</label>
                    <input
                      type="text"
                      placeholder="+971..."
                      value={config.phone}
                      onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                      className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Email</label>
                    <input
                      type="text"
                      placeholder="booking@..."
                      value={config.email}
                      onChange={(e) => setConfig({ ...config, email: e.target.value })}
                      className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Site Web"
                  value={config.website}
                  onChange={(e) => setConfig({ ...config, website: e.target.value })}
                  className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none"
                />
              </div>
            </div>
          </div>

          {/* Section Équipe Commerciale */}
          <div className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif italic text-slate-800">Équipe Commerciale</h3>
              <button onClick={addAgent} className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase">
                Ajouter un agent
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(config.agents || []).map(agent => (
                <div key={agent.id} className="p-6 bg-slate-50 rounded-3xl space-y-4 relative group">
                  <button onClick={() => deleteAgent(agent.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 text-xl transition">×</button>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom Complet" value={agent.name} onChange={e => updateAgent(agent.id, { name: e.target.value })} className="w-full bg-white rounded-xl p-3 text-sm font-bold border-none" />
                    <input type="text" placeholder="Fonction" value={agent.title} onChange={e => updateAgent(agent.id, { title: e.target.value })} className="w-full bg-white rounded-xl p-3 text-sm border-none" />
                    <input type="text" placeholder="Email" value={agent.email} onChange={e => updateAgent(agent.id, { email: e.target.value })} className="w-full bg-white rounded-xl p-3 text-sm border-none" />
                    <input type="text" placeholder="Téléphone" value={agent.phone} onChange={e => updateAgent(agent.id, { phone: e.target.value })} className="w-full bg-white rounded-xl p-3 text-sm border-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-serif italic text-slate-800">
              Modèles <span className="text-[#d4af37]">LalaJet</span>
            </h2>

            <div className="flex gap-4">
              <div className="flex bg-slate-100 p-1 rounded-full">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setEditingLang(l.code)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black transition ${editingLang === l.code ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}
                  >
                    {l.code}
                  </button>
                ))}
              </div>

              <button
                onClick={addModel}
                className="bg-slate-900 text-[#d4af37] border border-[#d4af37] px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition hover:bg-[#d4af37] hover:text-white"
              >
                Ajouter au Catalogue
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {catalog.map((model, idx) => (
              <div key={model.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 space-y-8 group relative">
                <button onClick={() => deleteModel(model.id)} className="absolute top-8 right-10 text-slate-200 hover:text-red-500 text-2xl transition">×</button>

                <div className="flex flex-col lg:flex-row gap-10">
                  <div className="lg:w-1/3 space-y-4">
                    <div className="aspect-video bg-slate-100 rounded-[2rem] overflow-hidden relative group/img border border-slate-100">
                      {model.images[0] ? (
                        <img src={model.images[0]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Image Principale</div>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center cursor-pointer">
                        <input type="file" className="hidden" onChange={(e) => handleModelImgUpload(idx, 0, e)} />
                        <span className="text-white text-[10px] font-black uppercase">Changer</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2].map(imgIdx => (
                        <div key={imgIdx} className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative group/subimg border border-slate-100">
                          {model.images[imgIdx] ? (
                            <img src={model.images[imgIdx]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200 text-[8px] font-black uppercase">Détail</div>
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/subimg:opacity-100 transition flex items-center justify-center cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => handleModelImgUpload(idx, imgIdx, e)} />
                            <span className="text-white text-[8px] font-black uppercase">Plus</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Nom de l'appareil ({editingLang})</label>
                        <input
                          type="text"
                          value={model.title[editingLang] || ''}
                          onChange={(e) => {
                            const newCat = [...catalog];
                            newCat[idx].title[editingLang] = e.target.value;
                            setCatalog(newCat);
                          }}
                          className="w-full bg-slate-50 rounded-2xl p-4 text-xl font-serif italic font-bold border-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Prix de base (€)</label>
                        <input
                          type="number"
                          value={model.price}
                          onChange={(e) => updateModel(idx, { price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-50 rounded-2xl p-4 text-xl font-black border-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-2">Description ({editingLang})</label>
                      <textarea
                        value={model.description[editingLang] || ''}
                        onChange={(e) => {
                          const newCat = [...catalog];
                          newCat[idx].description[editingLang] = e.target.value;
                          setCatalog(newCat);
                        }}
                        className="w-full bg-slate-50 rounded-[2rem] p-6 text-sm italic font-medium h-40 border-none resize-none focus:ring-2 focus:ring-[#d4af37]/20"
                        placeholder="Décrivez l'avion, sa configuration, son autonomie..."
                      />
                    </div>

                    <div className="flex gap-4 items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type d'offre :</span>
                      <select
                        value={model.type}
                        onChange={(e) => updateModel(idx, { type: e.target.value as any })}
                        className="bg-slate-100 rounded-full px-6 py-2 text-[10px] font-black uppercase border-none"
                      >
                        <option value="AIRCRAFT">Jet Privé</option>
                        <option value="SERVICE">Service Premium</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {catalog.length === 0 && (
              <div className="py-20 text-center text-slate-300 italic border-4 border-dashed border-slate-100 rounded-[3rem]">
                Aucun modèle dans le catalogue. Commencez par en créer un.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
