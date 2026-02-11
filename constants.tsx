import React from 'react';
import { Language } from './types';

export const LANGUAGES = [
  { code: Language.EN, name: 'English', flag: '🇬🇧' },
  { code: Language.FR, name: 'Français', flag: '🇫🇷' },
  { code: Language.DE, name: 'Deutsch', flag: '🇩🇪' },
  { code: Language.IT, name: 'Italiano', flag: '🇮🇹' },
  { code: Language.ES, name: 'Español', flag: '🇪🇸' },
  { code: Language.RU, name: 'Русский', flag: '🇷🇺' },
  { code: Language.HU, name: 'Magyar', flag: '🇭🇺' },
  { code: Language.PL, name: 'Polski', flag: '🇵🇱' },
];

export const TRANSLATIONS: Record<string, Record<Language, string>> = {
  quoteTitle: {
    [Language.EN]: 'QUOTATION',
    [Language.FR]: 'DEVIS',
    [Language.DE]: 'ANGEBOT',
    [Language.IT]: 'PREVENTIVO',
    [Language.ES]: 'PRESUPUESTO',
    [Language.RU]: 'ПРЕДЛОЖЕНИЕ',
    [Language.HU]: 'ÁRAJÁNLAT',
    [Language.PL]: 'OFERTA'
  },
  flightDetails: {
    [Language.EN]: 'Flight Details',
    [Language.FR]: 'Détails du vol',
    [Language.DE]: 'Flugdetails',
    [Language.IT]: 'Dettagli del volo',
    [Language.ES]: 'Detalles del vuelo',
    [Language.RU]: 'Детали полета',
    [Language.HU]: 'Repülési adatok',
    [Language.PL]: 'Szczegóły lotu'
  },
  outboundFlightLabel: {
    [Language.EN]: 'Outbound Flight',
    [Language.FR]: 'Vol Aller',
    [Language.DE]: 'Hinflug',
    [Language.IT]: 'Volo di andata',
    [Language.ES]: 'Vuelo de ida',
    [Language.RU]: 'Вылетающий рейс',
    [Language.HU]: 'Induló járat',
    [Language.PL]: 'Lot tam'
  },
  returnFlightLabel: {
    [Language.EN]: 'Return Flight',
    [Language.FR]: 'Vol Retour',
    [Language.DE]: 'Rückflug',
    [Language.IT]: 'Volo di ritorno',
    [Language.ES]: 'Vuelo de vuelta',
    [Language.RU]: 'Обратный рейс',
    [Language.HU]: 'Visszaút',
    [Language.PL]: 'Lot powrotny'
  },
  itineraryLabel: {
    [Language.EN]: 'Itinerary',
    [Language.FR]: 'Itinéraire',
    [Language.DE]: 'Reiseroute',
    [Language.IT]: 'Itinerario',
    [Language.ES]: 'Itinerario',
    [Language.RU]: 'Маршрут',
    [Language.HU]: 'Útvonal',
    [Language.PL]: 'Plan podróży'
  },
  dateTimeLabel: {
    [Language.EN]: 'Date & time',
    [Language.FR]: 'Date & heure',
    [Language.DE]: 'Datum & Zeit',
    [Language.IT]: 'Data e ora',
    [Language.ES]: 'Fecha y hora',
    [Language.RU]: 'Дата и время',
    [Language.HU]: 'Dátum és idő',
    [Language.PL]: 'Data i godzina'
  },
  passengersLabel: {
    [Language.EN]: 'Passengers',
    [Language.FR]: 'Passagers',
    [Language.DE]: 'Passagiere',
    [Language.IT]: 'Passeggeri',
    [Language.ES]: 'Pasajeros',
    [Language.RU]: 'Пассажиры',
    [Language.HU]: 'Utasok',
    [Language.PL]: 'Pasażerowie'
  },
  flightTimeLabel: {
    [Language.EN]: 'Flight time',
    [Language.FR]: 'Temps de vol',
    [Language.DE]: 'Flugzeit',
    [Language.IT]: 'Tempo di volo',
    [Language.ES]: 'Tiempo de vuelo',
    [Language.RU]: 'Время полета',
    [Language.HU]: 'Repülési idő',
    [Language.PL]: 'Czas lotu'
  },
  clientInfo: {
    [Language.EN]: 'Client Information',
    [Language.FR]: 'Informations Client',
    [Language.DE]: 'Kundeninformation',
    [Language.IT]: 'Informazioni Cliente',
    [Language.ES]: 'Información del Cliente',
    [Language.RU]: 'Информация o клиенте',
    [Language.HU]: 'Ügyfél információ',
    [Language.PL]: 'Informacja o kliencie'
  },
  total: {
    [Language.EN]: 'TOTAL',
    [Language.FR]: 'TOTAL',
    [Language.DE]: 'GESAMT',
    [Language.IT]: 'TOTALE',
    [Language.ES]: 'TOTAL',
    [Language.RU]: 'ИТОГО',
    [Language.HU]: 'ÖSSZESEN',
    [Language.PL]: 'SUMA'
  },
  subtotalHT: {
    [Language.EN]: 'Subtotal (Excl. Tax)',
    [Language.FR]: 'Sous-total HT',
    [Language.DE]: 'Zwischensumme (Netto)',
    [Language.IT]: 'Totale parziale (escl. tasse)',
    [Language.ES]: 'Subtotal (sin impuestos)',
    [Language.RU]: 'Подытог (без налогоv)',
    [Language.HU]: 'Részösszeg (Nettó)',
    [Language.PL]: 'Suma częściowa (Netto)'
  },
  totalTTC: {
    [Language.EN]: 'TOTAL (Incl. Tax)',
    [Language.FR]: 'TOTAL TTC',
    [Language.DE]: 'GESAMT (Inkl. MwSt)',
    [Language.IT]: 'TOTALE (IVA inclusa)',
    [Language.ES]: 'TOTAL (Incl. impuestos)',
    [Language.RU]: 'ИТОГО (с налогами)',
    [Language.HU]: 'ÖSSZESEN (Bruttó)',
    [Language.PL]: 'SUMA (Brutto)'
  },
  vatLabel: {
    [Language.EN]: 'VAT',
    [Language.FR]: 'TVA',
    [Language.DE]: 'MwSt.',
    [Language.IT]: 'IVA',
    [Language.ES]: 'IVA',
    [Language.RU]: 'НДС',
    [Language.HU]: 'ÁFA',
    [Language.PL]: 'VAT'
  },
  acceptanceText: {
    [Language.EN]: "I have read and I accept the general terms and conditions of sale",
    [Language.FR]: "J'ai lu et j'accepte les conditions générales de vente",
    [Language.DE]: "Ich habe die allgemeinen Verkaufsbedingungen gelesen und akzeptiere sie",
    [Language.IT]: "Ho letto e accetto le condizioni generali di vendita",
    [Language.ES]: "He leído y acepto las conditions generales de venta",
    [Language.RU]: "Я прочитал и принимаю общие условия продажи",
    [Language.HU]: "Elolvastam és elfogadom az általános értékesítési feltételeket",
    [Language.PL]: "Przeczytałem i akceptuję ogólne warunki sprzedaży"
  },
  signatureMention: {
    [Language.EN]: "Client signature preceded by the mention 'Read and approved, good for agreement'. The attached General Terms and Conditions of Sale are read and approved:",
    [Language.FR]: "Signature du client précédée de la mention 'Lu et approuvé, bon pour accord'. Les Conditions Générales de Vente jointes sont lues et approuvées :",
    [Language.DE]: "Unterschrift des Kunden mit dem Vermerk 'Gelesen und genehmigt, einverstanden'. Die beigefügten Allgemeinen Verkaufsbedingungen wurden gelesen und genehmigt:",
    [Language.IT]: "Firma del cliente preceduta dalla dicitura 'Letto e approvato, buono per accordo'. Le Condizioni Generali di Vendita allegate sono lette e approvate:",
    [Language.ES]: "Firma del cliente precedida de la mención 'Leído y aprobado, conforme'. Las Condiciones Generales de Venta adjuntas han sido leídas y aprobadas:",
    [Language.RU]: "Подпись клиента с пометкой 'Прочитано и одобрено, согласен'. Прилагаемые Общие условия продажи прочитаны и одобрены:",
    [Language.HU]: "Az ügyfél aláírása a 'Kiolvasva és jóváhagyva, elfogadva' megjegyzéssel. A mellékelt Általános Értékesítési Feltételek elolvasva és jóváhagyva:",
    [Language.PL]: "Podpis klienta poprzedzony adnotacją 'Przeczytano i zatwierdzono, zgadzam się'. Załączone Ogólne Warunki Sprzedaży zostały przeczytane i zaakceptowane:"
  }
};