// Seed / fallback business data. In production this is served from Supabase
// (branches, rate_card, franchise_assumptions tables — admin editable). These
// constants are the source of truth when the site runs without a backend and
// the seed for the SQL migration.

export interface Branch {
  id: string;
  name: string;
  brand: string; // brand label shown in uppercase
  address: string;
  phone: string;
  hours: string;
  lat: number | null;
  lng: number | null;
  upiId: string;
  confirmed: boolean; // false = address pending owner confirmation
  photoUrl?: string; // owner-supplied shop photo (public/branches/<id>.jpg once provided)
  mapsUrl?: string; // owner-supplied Google Maps share link (preferred over lat/lng search)
}

// NOTE: Only Mukund Nagar is fully confirmed. The other 5 use documented
// placeholder addresses/coords (approx. Pune landmarks) pending owner data —
// see VIRAT_WEBSITE_SPEC §14 TODO #1. Coordinates are approximate so the
// distance sort/map render; owner must confirm exact pins.
export const BRANCHES: Branch[] = [
  {
    id: "mukund-nagar",
    name: "Mukund Nagar",
    brand: "Virat Enterprises",
    address:
      "Shop 7, Hermes Heritage Shopping Complex, Rahim Shaikh Road, Mukund Nagar, Pune 411037",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.5011,
    lng: 73.8756,
    upiId: "virat.mukundnagar@upi",
    confirmed: true,
  },
  {
    id: "jm-road",
    name: "JM Road",
    brand: "Virat",
    address: "JM Road, Shivajinagar, Pune 411005 — full address pending confirmation",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.5236,
    lng: 73.8478,
    upiId: "virat.mukundnagar@upi",
    confirmed: false,
  },
  {
    id: "satara-road",
    name: "Satara Road",
    brand: "MM Digital",
    address: "Satara Road, Pune 411037 — full address pending confirmation",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.4849,
    lng: 73.8639,
    upiId: "virat.mukundnagar@upi",
    confirmed: false,
  },
  {
    id: "abc-chowk",
    name: "Appa Balwant Chowk",
    brand: "Virat",
    address: "Appa Balwant Chowk (ABC), Sadashiv Peth, Pune 411030 — pending confirmation",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.5118,
    lng: 73.8536,
    upiId: "virat.mukundnagar@upi",
    confirmed: false,
  },
  {
    id: "pune-corporation",
    name: "Pune Corporation",
    brand: "Virat",
    address: "Near Pune Municipal Corporation, Shivajinagar, Pune 411005 — pending confirmation",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.5308,
    lng: 73.8656,
    upiId: "virat.mukundnagar@upi",
    confirmed: false,
  },
  {
    id: "shanti-nagar",
    name: "Shanti Nagar",
    brand: "Virat",
    address: "Shanti Nagar, Pune — branch name & full address pending confirmation",
    phone: "+91 98231 41366",
    hours: "9:30 AM – 9:30 PM",
    lat: 18.4967,
    lng: 73.859,
    upiId: "virat.mukundnagar@upi",
    confirmed: false,
  },
];

// From the shop board (owner-provided).
export const GST_NUMBER = "27AFRPM4220Q1ZT";
export const TAGLINE_HI = "नाम ही काफी है !";
export const BRAND_HI = "विराट एंटरप्राइजेस";

export interface Service {
  name: string;
  price: string;
}

// Services + prices from the owner's shop board and rate card (Jul 2026).
export const SERVICES: Service[] = [
  { name: "Xerox & B/W printing", price: "₹2 per side · ₹1.50 for 100+" },
  { name: "Colour & digital print", price: "A4 ₹10 · 12×18 ₹40" },
  { name: "Jumbo B/W (A2·A1·A0)", price: "₹30 · ₹40 · ₹60 per print" },
  { name: "Jumbo colour (A2·A1·A0)", price: "₹60 · ₹80 · ₹120 per print" },
  { name: "Binding", price: "spiral ₹40 · blackbook ₹150 · rexine ₹350" },
  { name: "Photo & passport prints", price: "A4 ₹30 · glossy ₹50 · 9 passport ₹25" },
  { name: "Stickers & smart cards", price: "A4 ₹20 · transparent ₹40 · smart card ₹80" },
  { name: "Lamination · scanning · toner", price: "₹20 per A4 · jumbo scanning · refills" },
];

export interface RateRow {
  key: string;
  label: string;
  display: string;
}

export const RATE_CARD: RateRow[] = [
  { key: "a4_bw", label: "A4 · black & white", display: "₹2" },
  { key: "a4_bw_bulk", label: "A4 · B/W, 100+ sides", display: "₹1.50" },
  { key: "a4_color", label: "A4 · colour", display: "₹10" },
  { key: "jumbo_a2", label: "A2 jumbo · B/W / colour", display: "₹30 / ₹60" },
  { key: "jumbo_a1", label: "A1 jumbo · B/W / colour", display: "₹40 / ₹80" },
  { key: "jumbo_a0", label: "A0 jumbo · B/W / colour", display: "₹60 / ₹120" },
  { key: "spiral", label: "Spiral binding", display: "₹40" },
  { key: "hard", label: "Blackbook binding", display: "₹150" },
  { key: "rexine", label: "Rexine binding (premium)", display: "₹350" },
];

// Full specialty rate list from the owner's counter card — shown on /branches
// and seeded into the admin-editable rate_card table.
export const SPECIALTY_RATES: RateRow[] = [
  { key: "sticker_a4", label: "A4 sticker print", display: "₹20" },
  { key: "sticker_1218", label: "12×18 sticker print", display: "₹40" },
  { key: "color_1218", label: "12×18 colour print", display: "₹40" },
  { key: "sticker_transparent", label: "Transparent sticker A4", display: "₹40" },
  { key: "photo_a4", label: "A4 photo print (normal)", display: "₹30" },
  { key: "photo_a4_glossy", label: "A4 photo high glossy", display: "₹50" },
  { key: "passport_9", label: "Passport photos · 9", display: "₹25" },
  { key: "passport_30", label: "Passport photos · 30", display: "₹50" },
  { key: "smart_card", label: "Smart card", display: "₹80" },
];

// Franchise ROI calculator defaults (admin-editable `franchise_assumptions`).
export const FRANCHISE_ASSUMPTIONS = {
  defaultMonthlySale: 100000,
  minMonthlySale: 40000,
  maxMonthlySale: 400000,
  stepMonthlySale: 5000,
  grossMarginPct: 30,
  netMarginPct: 20,
  yearGrowthPct: 15,
};

export const INVESTMENT_TIERS = [
  {
    key: "starter",
    name: "STARTER",
    total: 1000000,
    totalLabel: "₹10 lakh",
    tag: "",
    bullets: [
      "Full brand licence & signage",
      "Standard machinery package guidance",
      "Staff training + launch support",
    ],
  },
  {
    key: "growth",
    name: "GROWTH",
    total: 2000000,
    totalLabel: "₹20 lakh",
    tag: "MOST CHOSEN",
    bullets: [
      "Everything in Starter",
      "Colour + large-format capacity",
      "Priority location survey",
    ],
  },
  {
    key: "premium",
    name: "PREMIUM",
    total: 3000000,
    totalLabel: "₹30 lakh",
    tag: "",
    bullets: [
      "Everything in Growth",
      "Full-service flagship fit-out",
      "Extended supply-chain support",
    ],
  },
];

export const FRANCHISE_STEPS = [
  { n: "01", title: "Submit interest", body: "Send the form below — takes a minute." },
  { n: "02", title: "Call & meeting", body: "The Virat team calls to understand your plan." },
  { n: "03", title: "Location survey", body: "We assess your area and approve the site." },
  { n: "04", title: "Agreement", body: "Sign the franchise agreement & pay the fee." },
  { n: "05", title: "Shop fit-out", body: "Design & setup of your shop (timeline shared)." },
  { n: "06", title: "Training", body: "Machines, software, billing and service training." },
  { n: "07", title: "Launch", body: "Go live — online orders route to your counter." },
];

export const INCLUSIONS = [
  "Brand name & marketing",
  "Shop layout design",
  "Machinery guidance",
  "Staff training",
  "Supply chain (paper/ink)",
  "Online orders routed to you",
  "Ongoing support",
  "Legal documents & licences",
];

export const SERVICE_TAGS = [
  "Xerox",
  "B/W & colour printing",
  "Binding",
  "Lamination",
  "Scanning",
  "Large-format / CAD",
  "Stationery",
];
