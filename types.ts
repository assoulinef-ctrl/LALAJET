export enum Language {
  FR = 'FR',
  EN = 'EN',
  DE = 'DE',
  IT = 'IT',
  ES = 'ES',
  RU = 'RU',
  HU = 'HU',
  PL = 'PL'
}

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  AED = 'AED'
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  country?: string;
  company?: string;
  notes?: string; 
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface FlightDetails {
  date: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  pax: number;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  originCoords: { x: number; y: number };
  destCoords: { x: number; y: number };
}

export interface QuoteCard {
  id: string;
  type: 'AIRCRAFT' | 'SERVICE';
  title: Record<Language, string>;
  description: Record<Language, string>;
  images: string[];
  price: number;
  isOptional: boolean;
  quantity: number;
}

export interface Quote {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  clientCountry?: string;
  language: Language;
  currency: Currency;
  flightDetails: FlightDetails;
  isRoundTrip?: boolean;
  returnFlightDetails?: FlightDetails;
  cards: QuoteCard[];
  taxRate: number;
  status: 'DRAFT' | 'ARCHIVED' | 'ACCEPTED';
  createdAt: string;
  // Champs Commercial
  agentName?: string;
  agentTitle?: string;
  agentEmail?: string;
  agentPhone?: string;
}

export interface CompanyConfig {
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  legalDisclaimer: string;
  footerInfo?: string; 
  primaryColor: string;
  googleMapsApiKey?: string;
  googlePlacesApiKey?: string;
  agents?: Agent[];
}