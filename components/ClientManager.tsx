import React, { useState } from 'react';
import { Client } from '../types';

interface ClientManagerProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

export const ClientManager: React.FC<ClientManagerProps> = ({ clients, setClients }) => {
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

  const saveClient = () => {
    if (!editingClient?.name || !editingClient?.email) return;
    
    if (editingClient.id) {
      setClients(clients.map(c => c.id === editingClient.id ? editingClient as Client : c));
    } else {
      const newClient = { ...editingClient, id: 'cl-' + Date.now() } as Client;
      setClients([...clients, newClient]);
    }
    setEditingClient(null);
  };

  const deleteClient = (id: string) => {
    if (confirm("Supprimer ce client ?")) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6">
        <div>
          <h2 className="text-4xl font-serif italic text-slate-800">Fichier Clients</h2>
          <p className="text-slate-400 text-sm mt-1">Base de données interne LalaJet</p>
        </div>
        <button onClick={() => setEditingClient({ name: '', email: '', phone: '', address: '', country: '', company: '', notes: '' })} className="bg-slate-900 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
          AJOUTER CLIENT
        </button>
      </div>

      {editingClient && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl space-y-6 border-2 border-[#E73188]/20 animate-in fade-in slide-in-from-top-4">
           <h3 className="text-xl font-serif font-bold">Client Information</h3>
           <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Nom Complet" value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm font-bold" />
              <input type="email" placeholder="Email Professionnel" value={editingClient.email} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm font-bold" />
              <input type="text" placeholder="Téléphone" value={editingClient.phone} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm font-bold" />
              <input type="text" placeholder="Société" value={editingClient.company} onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm font-bold" />
              <input type="text" placeholder="Adresse" value={editingClient.address} onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm" />
              <input type="text" placeholder="Pays" value={editingClient.country} onChange={(e) => setEditingClient({ ...editingClient, country: e.target.value })} className="bg-slate-50 rounded-xl p-4 text-sm" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Observations Internes (Masquées sur devis)</label>
              <textarea placeholder="Historique client, préférences catering, habitudes de vol..." value={editingClient.notes} onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 text-sm h-32 resize-none" />
           </div>
           <div className="flex gap-4">
              <button onClick={saveClient} className="bg-[#E73188] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Enregistrer</button>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Annuler</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {clients.map(client => (
          <div key={client.id} onClick={() => setEditingClient(client)} className="bg-white p-8 rounded-[2rem] shadow-lg group relative border border-transparent hover:border-[#E73188]/20 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-serif italic font-bold text-black">{client.name}</h4>
                <p className="text-[10px] font-black uppercase text-[#E73188]">{client.company || 'Private Client'}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingClient(client);
                  }} 
                  className="text-slate-300 hover:text-blue-500 transition p-2 bg-slate-50 rounded-full hover:bg-blue-50 relative z-30"
                  title="Modifier ce client"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteClient(client.id);
                  }} 
                  className="text-slate-300 hover:text-red-500 transition p-2 bg-slate-50 rounded-full hover:bg-red-50 relative z-30"
                  title="Supprimer ce client"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 space-y-2 border-t pt-4">
               <p className="flex items-center gap-2">📧 {client.email}</p>
               <p className="flex items-center gap-2">📞 {client.phone}</p>
               <p className="flex items-center gap-2">📍 {client.address || '-'} {client.country}</p>
            </div>
            {client.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[10px] italic text-slate-400 border-l-2 border-slate-200">
                {client.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};