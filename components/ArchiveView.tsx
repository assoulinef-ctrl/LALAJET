import React from 'react';
import { Quote } from '../types';

interface ArchiveViewProps {
  archives: Quote[];
  setActiveQuote: React.Dispatch<React.SetStateAction<Quote>>;
  setView: React.Dispatch<React.SetStateAction<any>>;
  deleteQuote: (id: string) => void;
  toggleStatus: (id: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ archives, setActiveQuote, setView, deleteQuote, toggleStatus }) => {
  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6">
        <div>
          <h2 className="text-4xl font-serif italic text-slate-800">Gestion des Archives</h2>
          <p className="text-slate-400 text-sm mt-1">Historique complet des devis générés</p>
        </div>
        <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          {archives.length} DOCUMENT(S) ARCHIVÉ(S)
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {archives.map(quote => (
          <div key={quote.id} className={`bg-white p-8 rounded-[2.5rem] shadow-lg border-2 transition-all group relative overflow-hidden ${quote.status === 'ACCEPTED' ? 'border-[#d4af37] ring-4 ring-[#d4af37]/10' : 'border-slate-50 hover:border-slate-200'}`}>
            
            {quote.status === 'ACCEPTED' && (
              <div className="absolute top-0 right-0 bg-[#d4af37] text-white px-6 py-1 text-[8px] font-black uppercase tracking-[0.3em] rotate-45 translate-x-4 translate-y-2 shadow-lg z-10">
                Accepté
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black text-[#d4af37] tracking-widest uppercase">{quote.id}</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteQuote(quote.id);
                }} 
                className="text-slate-200 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-2 bg-slate-50 rounded-full hover:bg-red-50 relative z-30"
                title="Supprimer ce devis"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-2xl font-serif font-bold italic text-slate-800 mb-1">{quote.clientName || 'Sans Nom'}</h4>
              <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                Émis le {new Date(quote.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter flex items-center gap-2">
                {quote.flightDetails.from} <span className="text-[#d4af37]">✈</span> {quote.flightDetails.to}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
              <div className="flex justify-between items-center">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveQuote(quote); setView('PREVIEW'); }}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition flex items-center gap-2"
                >
                  Ouvrir le PDF
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStatus(quote.id); }}
                  className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition relative z-20 ${quote.status === 'ACCEPTED' ? 'bg-slate-100 text-slate-400' : 'bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37] hover:text-white'}`}
                >
                  {quote.status === 'ACCEPTED' ? 'Rétablir' : 'Confirmer Signature'}
                </button>
              </div>
              
              <button 
                onClick={(e) => { 
                   e.preventDefault(); e.stopPropagation();
                   const clone: Quote = { ...quote, id: 'LJ-' + Date.now().toString().slice(-4) + '-' + Math.floor(Math.random() * 9000 + 1000), createdAt: new Date().toISOString(), status: 'DRAFT' };
                   setActiveQuote(clone); 
                   setView('EDITOR'); 
                }}
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] transition relative z-20"
              >
                Dupliquer & Éditer
              </button>
            </div>
          </div>
        ))}

        {archives.length === 0 && (
          <div className="col-span-full py-32 text-center text-slate-300 italic border-4 border-dashed border-slate-100 rounded-[40px]">
            <div className="text-5xl mb-4">📂</div>
            Aucun devis archivé pour le moment.
          </div>
        )}
      </div>
    </div>
  );
};