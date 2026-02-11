import React, { useEffect, useState, useRef } from 'react';
import { Quote, Language, Currency, CompanyConfig, FlightDetails } from '../types';
import { TRANSLATIONS } from '../constants';

interface QuotePreviewProps {
  quote: Quote;
  setQuote: React.Dispatch<React.SetStateAction<Quote>>;
  config: CompanyConfig;
}

export const QuotePreview: React.FC<QuotePreviewProps> = ({ quote, setQuote, config }) => {
  const [zoom, setZoom] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  
  const lang = quote.language;
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.[Language.EN] || key;

  const getFailsafeText = (record: Record<Language, string>) => {
    return record[lang] || record[Language.EN] || record[Language.FR] || Object.values(record).find(v => v) || "";
  };

  const subtotalHT = quote.cards.reduce((sum, card) => sum + (card.price * (card.quantity || 1)), 0);
  const taxAmount = (subtotalHT * quote.taxRate) / 100;
  const totalTTC = subtotalHT + taxAmount;
  
  const currencySymbol = quote.currency === Currency.EUR ? '€' : quote.currency === Currency.USD ? '$' : 'AED ';

  useEffect(() => {
    const generateMap = async () => {
      const { originLat, originLng, destLat, destLng } = quote.flightDetails;
      if (originLat == null || originLng == null || destLat == null || destLng == null) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1600; 
      canvas.height = 800;

      const minLat = Math.min(originLat, destLat);
      const maxLat = Math.max(originLat, destLat);
      const minLng = Math.min(originLng, destLng);
      const maxLng = Math.max(originLng, destLng);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff * 0.6);
      
      let z = 3;
      if (maxDiff < 2) z = 8;
      else if (maxDiff < 5) z = 7;
      else if (maxDiff < 12) z = 6;
      else if (maxDiff < 25) z = 5;
      else if (maxDiff < 50) z = 4;

      const lat2tile = (lat: number, zoom: number) => {
        return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
      };
      const lng2tile = (lng: number, zoom: number) => {
        return (lng + 180) / 360 * Math.pow(2, zoom);
      };

      const centerX = lng2tile(centerLng, z);
      const centerY = lat2tile(centerLat, z);
      const tileSize = 256;
      const tileRange = 4; 
      const tilePromises = [];

      ctx.fillStyle = '#aadaff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let x = Math.floor(centerX - tileRange); x <= Math.ceil(centerX + tileRange); x++) {
        for (let y = Math.floor(centerY - tileRange); y <= Math.ceil(centerY + tileRange); y++) {
          const url = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
          tilePromises.push(new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const dx = (x - centerX) * tileSize + canvas.width / 2;
              const dy = (y - centerY) * tileSize + canvas.height / 2;
              ctx.drawImage(img, dx, dy, tileSize, tileSize);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          }));
        }
      }

      await Promise.all(tilePromises);

      const getPos = (lat: number, lng: number) => ({
        x: (lng2tile(lng, z) - centerX) * tileSize + canvas.width / 2,
        y: (lat2tile(lat, z) - centerY) * tileSize + canvas.height / 2
      });

      const p1 = getPos(originLat, originLng);
      const p2 = getPos(destLat, destLng);

      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#d4af37';
      const cpX = (p1.x + p2.x) / 2;
      const cpY = (p1.y + p2.y) / 2 - Math.abs(p1.x - p2.x) * 0.15;
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
      ctx.stroke();

      const drawPlane = (p: {x: number, y: number}, color: string, rotation: number) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotation);
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.font = "22px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("✈", 0, 0);
        ctx.restore();
      };

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      drawPlane(p1, "#d4af37", angle);
      drawPlane(p2, "#E73188", angle);

      setMapImage(canvas.toDataURL('image/jpeg', 0.9));
    };

    generateMap();
  }, [quote.flightDetails]);

  const handleDownloadPDF = async () => {
    const element = pdfContentRef.current;
    const h2p = (window as any).html2pdf;
    if (!h2p || !element) return;

    setIsGenerating(true);
    const savedZoom = zoom;
    setZoom(100);

    await new Promise(r => setTimeout(r, 1500));

    try {
      const options = {
        margin: 0,
        filename: `LalaJet_${quote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true, 
          logging: false,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await h2p().set(options).from(element).save();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
      setZoom(savedZoom);
    }
  };

  const PageHeader = ({ pageNum, total }: { pageNum: number; total: number }) => (
    <header className="flex justify-between items-start mb-6 border-b-4 pb-4 shrink-0" style={{ borderColor: config.primaryColor }}>
      <div className="w-1/3">
        {config.logo && <img src={config.logo} alt="LalaJet" className="h-44 w-auto object-contain" crossOrigin="anonymous" />}
      </div>
      <div className="w-2/3 text-right">
        <h1 className="text-5xl font-serif text-black italic tracking-tighter uppercase font-black leading-none">
          {t('quoteTitle')} <span className="text-[10px] not-italic font-sans opacity-30 ml-2 tracking-[0.2em] font-black uppercase">PAGE {pageNum}/{total}</span>
        </h1>
        <div className="text-[12px] font-black text-[#d4af37] tracking-[0.3em] uppercase mt-1">REF: {quote.id} | {new Date(quote.createdAt).toLocaleDateString(lang.toLowerCase())}</div>
        
        {quote.agentName && (
          <div className="mt-2 text-[10px] font-black text-slate-500 uppercase flex flex-col items-end">
            <div className="text-black font-black tracking-widest">{quote.agentName} — {quote.agentTitle}</div>
            <div className="opacity-70 mt-0.5">{quote.agentEmail} • {quote.agentPhone}</div>
          </div>
        )}
      </div>
    </header>
  );

  const PageFooter = () => (
    <footer className="mt-auto pt-4 pb-2 flex flex-col shrink-0">
      <div className="w-full h-[2px] mb-4" style={{ backgroundColor: config.primaryColor, opacity: 0.4 }}></div>
      <div className="flex justify-between items-end">
        <div className="w-1/2">
          <p className="text-[8px] text-black font-black uppercase tracking-[0.1em] leading-tight italic">
            {config.legalDisclaimer}
          </p>
        </div>
        <div className="w-1/2 text-right">
          <p className="text-[8px] text-black font-black uppercase tracking-[0.15em]">
            {config.address} • {config.phone} • {config.website}
          </p>
          <span className="text-[10px] font-serif italic font-black text-[#d4af37] mt-0.5 block">LalaJet Luxury Aviation Broker</span>
        </div>
      </div>
    </footer>
  );

  const FlightInfoBlock = ({ details, label }: { details: FlightDetails, label: string }) => (
    <div className="pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[8px] font-black text-[#E73188] uppercase tracking-[0.2em]">{label}</span>
        <span className="text-[10px] font-black text-black uppercase">{details.date} {details.departureTime && `• ${details.departureTime}`}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[11px] font-black text-black">
          <span>{details.from.split(',')[0]}</span>
          <span className="text-[#d4af37]">✈</span>
          <span>{details.to.split(',')[0]}</span>
        </div>
        <div className="flex gap-4 text-[9px] font-black uppercase text-slate-400">
          <span>{details.pax} PAX</span>
          <span className="text-[#E73188]">{details.duration}</span>
        </div>
      </div>
    </div>
  );

  const totalPages = 1 + quote.cards.length;

  return (
    <div className="bg-[#2d2d2d] h-screen flex flex-col no-print overflow-hidden">
      <div className="h-14 bg-[#3c3c3c] border-b border-black flex items-center justify-between px-6 z-50 shadow-lg shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="bg-[#E73188] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">PDF PREVIEW</span>
            <span className="text-white text-xs opacity-80">{quote.id}.pdf</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-white hover:bg-white/10 p-1.5 rounded transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4"/></svg></button>
             <span className="text-white text-[10px] font-black w-10 text-center">{zoom}%</span>
             <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-white hover:bg-white/10 p-1.5 rounded transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={handleDownloadPDF} disabled={isGenerating} className={`${isGenerating ? 'bg-slate-600' : 'bg-[#E73188]'} text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2`}>
               {isGenerating ? "Génération..." : "Générer PDF Final"}
             </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-[#2d2d2d] scrollbar-hide">
          <div ref={pdfContentRef} className={`mx-auto flex flex-col items-center origin-top transition-transform duration-200 ${!isGenerating ? 'py-16' : ''}`} style={{ transform: `scale(${zoom / 100})` }}>
            
            <div className={`a4-page bg-white w-[210mm] h-[296mm] pt-12 px-16 pb-8 flex flex-col relative overflow-hidden box-border shadow-2xl ${!isGenerating ? 'mb-12' : ''}`} style={{ pageBreakAfter: 'always' }}>
              <PageHeader pageNum={1} total={totalPages} />
              
              <div className="grid grid-cols-2 gap-6 mb-6 shrink-0">
                <section className="bg-slate-50 p-5 rounded-[2rem] border-l-[8px] shadow-sm" style={{ borderLeftColor: config.primaryColor }}>
                  <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-2 text-[#E73188]">{t('clientInfo')}</h2>
                  <div className="text-2xl font-serif font-black text-black italic leading-none mb-2">{quote.clientName || 'Client Privé'}</div>
                  <div className="text-[10px] text-black font-black uppercase tracking-widest leading-relaxed">
                    {quote.clientEmail}<br/>
                    {quote.clientPhone}<br/>
                    {quote.clientAddress} {quote.clientCountry}
                  </div>
                </section>
                
                <section className="bg-slate-50 p-5 rounded-[2rem] border-l-[8px] shadow-sm" style={{ borderLeftColor: config.primaryColor }}>
                  <h2 className="text-[9px] font-black uppercase tracking-[0.3em] mb-2 text-[#E73188]">{t('flightDetails')}</h2>
                  <FlightInfoBlock details={quote.flightDetails} label={t('outboundFlightLabel')} />
                  {quote.isRoundTrip && quote.returnFlightDetails && <FlightInfoBlock details={quote.returnFlightDetails} label={t('returnFlightLabel')} />}
                </section>
              </div>

              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="p-3 bg-white rounded-[3rem] shadow-xl border-2 border-slate-100 overflow-hidden">
                  <div className="h-[400px] w-full bg-[#aadaff] rounded-[2.5rem] relative overflow-hidden border-2 border-slate-50 shadow-inner">
                    {mapImage ? <img src={mapImage} crossOrigin="anonymous" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-black uppercase tracking-widest">Initialisation...</div>}
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="bg-black px-12 py-3 rounded-full shadow-lg">
                    <span className="text-[9px] font-black text-white uppercase tracking-[0.6em]">LalaJet Global Itinerary (OSM Voyager)</span>
                  </div>
                </div>
              </div>

              <PageFooter />
            </div>

            {quote.cards.map((card, index) => {
              const pageNumber = index + 2;
              const isLastPage = pageNumber === totalPages;
              const isPremium = getFailsafeText(card.title).toLowerCase().includes('premium');

              return (
                <div key={card.id} className={`a4-page bg-white w-[210mm] h-[296mm] pt-12 px-16 pb-8 flex flex-col relative overflow-hidden box-border shadow-2xl ${!isGenerating && !isLastPage ? 'mb-12' : ''}`} style={{ pageBreakAfter: isLastPage ? 'auto' : 'always' }}>
                  <PageHeader pageNum={pageNumber} total={totalPages} />
                  
                  {/* BLOC ARTICLE - TAILLES RÉDUITES -30% */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex gap-8 items-start relative">
                      {isPremium && <div className="absolute top-0 right-0 bg-[#d4af37] text-black px-5 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-[0.2em] z-10 shadow-lg">PREMIUM EXCELLENCE</div>}
                      <div className="w-[48%] shrink-0 space-y-8">
                        <div className="aspect-[16/9] rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-white">
                          {card.images?.[0] && <img src={card.images[0]} className="w-full h-full object-cover" crossOrigin="anonymous" />}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          {card.images?.slice(1, 3).map((img, i) => img && (
                            <div key={i} className="aspect-square rounded-[2rem] overflow-hidden shadow-xl border-4 border-white bg-slate-50">
                               <img src={img} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 pt-6">
                        <div className="flex justify-between items-baseline mb-6 border-b-[6px] pb-4" style={{ borderColor: card.type === 'AIRCRAFT' ? '#d4af37' : '#E73188' }}>
                          <h3 className="text-2xl font-serif text-black italic font-black leading-tight tracking-tight">{getFailsafeText(card.title)}</h3>
                          <div className="text-xl font-black text-black tracking-tighter ml-6">{currencySymbol}{card.price.toLocaleString()}</div>
                        </div>
                        <p className="text-[10px] text-black italic font-medium opacity-90 leading-relaxed text-justify mb-8">{getFailsafeText(card.description)}</p>
                        <div className="flex w-fit items-center gap-4 px-6 py-2 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.type === 'AIRCRAFT' ? '#d4af37' : '#E73188' }}></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-black">{card.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isLastPage && (
                    <div className="mt-8 pt-6 border-t-8 border-black shrink-0">
                      <div className="grid grid-cols-2 gap-12 items-end">
                        <div className="space-y-4 text-left">
                          <p className="text-[9px] font-black text-black italic uppercase tracking-tight leading-snug">{t('signatureMention')}</p>
                          <div className="h-24 w-full border-[3px] border-dashed border-slate-900 rounded-[2rem] flex items-end p-5 bg-slate-50/20">
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">SIGN HERE</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* Restauration Détail HT et Ligne TAXES */}
                          {quote.taxRate > 0 && (
                            <div className="flex flex-col gap-1 px-4 mb-2">
                              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                <span>{t('subtotalHT')}</span>
                                <span>{currencySymbol}{subtotalHT.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-[9px] font-black uppercase text-[#E73188] tracking-widest">
                                <span>{t('vatLabel')} ({quote.taxRate}%)</span>
                                <span>{currencySymbol}{taxAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          <div className="w-full text-white p-6 rounded-[2.5rem] bg-[#0f172a] flex justify-between items-center shadow-xl border-b-[8px] border-black">
                             <span className="text-[12px] font-black uppercase text-[#d4af37] tracking-[0.5em]">{t('total')}</span>
                             <span className="text-2xl font-serif italic font-black">{currencySymbol}{totalTTC.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <PageFooter />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};