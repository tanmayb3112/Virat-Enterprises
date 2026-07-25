'use client';

import { useState, useRef, CSSProperties } from 'react';
import { inr } from '@/lib/format';
import { BRANCHES } from '@/lib/data';

// ---------------------------------------------------------------------------
// Staff orders dashboard — /admin
// DEMO PAGE: Supabase realtime is NOT wired yet, so the queue below is realistic
// hard-coded mock data. When Supabase is configured this list streams live and
// the mutations (verify / advance / cancel / mark-out / mark-delivered) persist
// to the orders table + broadcast to every open dashboard.
// ---------------------------------------------------------------------------

type Status =
  | 'RECEIVED'
  | 'PAYMENT_PENDING_VERIFICATION'
  | 'PAID'
  | 'PRINTING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

const FLOW: Status[] = [
  'RECEIVED',
  'PAYMENT_PENDING_VERIFICATION',
  'PAID',
  'PRINTING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
];

interface FileItem {
  file: string;
  ext: 'PDF' | 'JPG' | 'DOC';
  spec: string;
  pagesLine: string;
  lineTotal: string;
}
interface AuditEvent {
  time: string;
  status: Status;
  note: string;
}
interface Order {
  no: string;
  name: string;
  phone: string;
  status: Status;
  total: number;
  sheets: number;
  age: string;
  placedAt: string;
  delivery: string;
  pay: string;
  drop: string;
  dropLat: number;
  dropLng: number;
  free: boolean;
  finishing: string;
  items: FileItem[];
  events: AuditEvent[];
}

const ORDERS: Order[] = [
  {
    no: 'VE-MUK-202607-0142',
    name: 'Aditi Kulkarni',
    phone: '+91 98765 43210',
    status: 'PAID',
    total: 542,
    sheets: 26,
    age: '4 min ago',
    placedAt: '26 Jul 2026, 10:12 am',
    delivery: 'Delivery · 2.4 km · FREE',
    pay: 'UPI · UTR 448291023344',
    drop: '12 Sahawas Society, Lane 4, Mukund Nagar, Pune 411037',
    dropLat: 18.4998,
    dropLng: 73.872,
    free: true,
    finishing: 'Spiral binding',
    items: [
      {
        file: 'Assignment_Unit3.pdf',
        ext: 'PDF',
        spec: 'A4 · Colour · Double-sided · 70 GSM · 2 copies',
        pagesLine: '24 pages → 48 sides, 24 sheets',
        lineTotal: inr(480),
      },
      {
        file: 'Cover_Page.pdf',
        ext: 'PDF',
        spec: 'A4 · Colour · Single-sided · 100 GSM · 2 copies',
        pagesLine: '1 page → 2 sides',
        lineTotal: inr(22),
      },
    ],
    events: [
      { time: '10:12', status: 'RECEIVED', note: 'Order created · web · utm_source=instagram' },
      { time: '10:13', status: 'PAYMENT_PENDING_VERIFICATION', note: 'UTR submitted by customer' },
      { time: '10:15', status: 'PAID', note: 'Verified by staff@virat.co.in' },
    ],
  },
  {
    no: 'VE-MUK-202607-0141',
    name: 'Rohan Deshpande',
    phone: '+91 90210 55871',
    status: 'PAYMENT_PENDING_VERIFICATION',
    total: 1240,
    sheets: 180,
    age: '11 min ago',
    placedAt: '26 Jul 2026, 10:05 am',
    delivery: 'Delivery · 4.6 km',
    pay: 'UPI · UTR 993214778120 — unverified',
    drop: 'Flat 402, Ganga Osian Park, NIBM Road, Pune 411048',
    dropLat: 18.4612,
    dropLng: 73.9089,
    free: false,
    finishing: 'Hard binding',
    items: [
      {
        file: 'Project_Report.docx',
        ext: 'DOC',
        spec: 'A4 · B/W · Double-sided · 80 GSM · 3 copies',
        pagesLine: '~120 pages (customer-entered) — verify',
        lineTotal: inr(1090),
      },
    ],
    events: [
      { time: '10:05', status: 'RECEIVED', note: 'Order created · guest checkout' },
      { time: '10:06', status: 'PAYMENT_PENDING_VERIFICATION', note: 'UTR submitted by customer' },
    ],
  },
  {
    no: 'VE-MUK-202607-0140',
    name: 'Sneha Pawar',
    phone: '+91 88060 41200',
    status: 'PRINTING',
    total: 320,
    sheets: 8,
    age: '38 min ago',
    placedAt: '26 Jul 2026, 9:38 am',
    delivery: 'Pickup',
    pay: 'Razorpay · captured',
    drop: 'Pickup at Mukund Nagar counter',
    dropLat: 18.5011,
    dropLng: 73.8756,
    free: false,
    finishing: 'None',
    items: [
      {
        file: 'Fest_Poster_Final.jpg',
        ext: 'JPG',
        spec: 'A3 · Colour · Single-sided · Glossy · 8 copies',
        pagesLine: '1 page → 8 sides, 8 sheets',
        lineTotal: inr(280),
      },
    ],
    events: [
      { time: '9:38', status: 'RECEIVED', note: 'Order created · web' },
      { time: '9:38', status: 'PAID', note: 'Razorpay webhook payment.captured' },
      { time: '9:52', status: 'PRINTING', note: 'Started by staff@virat.co.in' },
    ],
  },
  {
    no: 'VE-MUK-202607-0139',
    name: 'Imran Shaikh',
    phone: '+91 77380 91002',
    status: 'READY',
    total: 158,
    sheets: 28,
    age: '1 hr ago',
    placedAt: '26 Jul 2026, 9:10 am',
    delivery: 'Delivery · 1.8 km',
    pay: 'UPI · verified',
    drop: 'Shop 3, Hermes Heritage, Mukund Nagar, Pune 411037',
    dropLat: 18.502,
    dropLng: 73.8749,
    free: false,
    finishing: 'Staple',
    items: [
      {
        file: 'Rent_Agreement.pdf',
        ext: 'PDF',
        spec: 'Legal · B/W · Single-sided · 80 GSM · 2 copies',
        pagesLine: '14 pages → 28 sides',
        lineTotal: inr(158),
      },
    ],
    events: [
      { time: '9:10', status: 'RECEIVED', note: 'Order created · web' },
      { time: '9:12', status: 'PAID', note: 'Verified by staff@virat.co.in' },
      { time: '9:44', status: 'READY', note: 'Job completed, awaiting courier' },
    ],
  },
  {
    no: 'VE-MUK-202607-0138',
    name: 'Priya Nair',
    phone: '+91 99223 71640',
    status: 'OUT_FOR_DELIVERY',
    total: 2650,
    sheets: 484,
    age: '2 hr ago',
    placedAt: '26 Jul 2026, 8:20 am',
    delivery: 'Delivery · 2.9 km · FREE',
    pay: 'Razorpay · captured',
    drop: '5 Lotus Bldg, Gultekdi, Pune 411037',
    dropLat: 18.4959,
    dropLng: 73.8681,
    free: true,
    finishing: 'Spiral binding',
    items: [
      {
        file: 'Thesis_Final_v7.pdf',
        ext: 'PDF',
        spec: 'A4 · B/W · Double-sided · 100 GSM · 4 copies',
        pagesLine: '186 pages → 744 sides, 372 sheets',
        lineTotal: inr(1488),
      },
      {
        file: 'Plates_Colour.pdf',
        ext: 'PDF',
        spec: 'A4 · Colour · Single-sided · 100 GSM · 4 copies',
        pagesLine: '28 pages → 112 sides',
        lineTotal: inr(1122),
      },
    ],
    events: [
      { time: '8:20', status: 'RECEIVED', note: 'Order created · web' },
      { time: '8:21', status: 'PAID', note: 'Razorpay webhook payment.captured' },
      { time: '9:30', status: 'READY', note: 'Job completed' },
      { time: '9:55', status: 'OUT_FOR_DELIVERY', note: 'Uber parcel · UB-77120 · fee ₹68 paid by Virat' },
    ],
  },
  {
    no: 'VE-MUK-202607-0137',
    name: 'Kunal Jadhav',
    phone: '+91 70301 22458',
    status: 'COMPLETED',
    total: 74,
    sheets: 7,
    age: '3 hr ago',
    placedAt: '26 Jul 2026, 7:45 am',
    delivery: 'Pickup',
    pay: 'UPI · verified',
    drop: 'Picked up at counter',
    dropLat: 18.5011,
    dropLng: 73.8756,
    free: false,
    finishing: 'None',
    items: [
      {
        file: 'Ration_Card_Scan.pdf',
        ext: 'PDF',
        spec: 'A4 · Colour · Single-sided · 70 GSM · 1 copy',
        pagesLine: '7 pages → 7 sides',
        lineTotal: inr(70),
      },
    ],
    events: [
      { time: '7:45', status: 'RECEIVED', note: 'Order created · walk-in assisted' },
      { time: '7:46', status: 'PAID', note: 'Verified by staff@virat.co.in' },
      { time: '8:02', status: 'COMPLETED', note: 'Handed over at counter' },
    ],
  },
];

// --- shared style helpers (mirror the prototype exactly) --------------------
function statusLabel(s: Status): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^./, (m) => m.toUpperCase());
}

const PILL_MAP: Record<Status, [string, string]> = {
  RECEIVED: ['#EDF2FA', '#1B3A6B'],
  PAYMENT_PENDING_VERIFICATION: ['#FBF0E2', '#8A5A22'],
  PAID: ['#EAF3EC', '#1F6B3E'],
  PRINTING: ['#EFEAFB', '#5B3FA8'],
  READY: ['#E8F2F7', '#1B6584'],
  OUT_FOR_DELIVERY: ['#FBF0E2', '#B4610F'],
  COMPLETED: ['#EFEEE9', '#6F6B62'],
  CANCELLED: ['#FAEDED', '#B23B3B'],
};
function pill(status: Status): CSSProperties {
  const [bg, color] = PILL_MAP[status];
  return {
    background: bg,
    color,
    fontSize: '10.5px',
    fontWeight: 800,
    letterSpacing: '.05em',
    padding: '3px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  };
}
function fileBadge(ext: FileItem['ext']): CSSProperties {
  const c = ext === 'PDF' ? '#B23B3B' : ext === 'JPG' ? '#1F6B3E' : '#1B3A6B';
  return {
    width: '40px',
    height: '40px',
    flex: 'none',
    borderRadius: '6px',
    border: '1px solid ' + c + '33',
    color: c,
    fontSize: '10px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
  };
}
function chipStyle(active: boolean): CSSProperties {
  return active
    ? {
        padding: '9px 15px',
        borderRadius: '6px',
        border: '1px solid #1B3A6B',
        background: '#1B3A6B',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }
    : {
        padding: '9px 15px',
        borderRadius: '6px',
        border: '1px solid #D8D2C4',
        background: '#fff',
        color: '#55524A',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      };
}
function smallChip(active: boolean): CSSProperties {
  return active
    ? {
        padding: '7px 12px',
        borderRadius: '6px',
        border: '1px solid #1B3A6B',
        background: '#1B3A6B',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }
    : {
        padding: '7px 12px',
        borderRadius: '6px',
        border: '1px solid #D8D2C4',
        background: '#fff',
        color: '#55524A',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      };
}

const FILTERS: { key: 'all' | Status; label: string }[] = [
  { key: 'all', label: 'All open' },
  { key: 'PAYMENT_PENDING_VERIFICATION', label: 'To verify' },
  { key: 'PAID', label: 'To print' },
  { key: 'READY', label: 'To dispatch' },
];

const BRANCH = BRANCHES.find((b) => b.id === 'mukund-nagar')!;
const FREE_RADIUS_KM = 3;
const FREE_MIN_ORDER = 500;

export default function AdminDashboard() {
  const [staffFilter, setStaffFilter] = useState<'all' | Status>('all');
  const [expandedId, setExpandedId] = useState<string>(ORDERS[0].no);
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [totalOverrides, setTotalOverrides] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState<'' | 'pickup' | 'drop'>('');
  const [verifiedPages, setVerifiedPages] = useState<string>('120');
  const [repriced, setRepriced] = useState(false);
  const [vendor, setVendor] = useState<'uber' | 'rapido' | 'other'>('uber');
  const [trackingId, setTrackingId] = useState('');
  const [courierFee, setCourierFee] = useState('');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderStatus = (o: Order): Status => overrides[o.no] || o.status;
  const orderTotal = (o: Order): number =>
    totalOverrides[o.no] !== undefined ? totalOverrides[o.no] : o.total;
  const setStatus = (no: string, st: Status) =>
    setOverrides((prev) => ({ ...prev, [no]: st }));

  const copy = (text: string, key: 'pickup' | 'drop') => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard unavailable in demo */
    }
    setCopied(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(''), 1600);
  };

  const selectOrder = (no: string) => {
    setExpandedId(no);
    setVerifiedPages('120');
    setRepriced(false);
  };

  const queue = ORDERS.filter((o) => {
    const st = orderStatus(o);
    if (staffFilter === 'all') return st !== 'COMPLETED' && st !== 'CANCELLED';
    return st === staffFilter;
  });

  const so = ORDERS.find((o) => o.no === expandedId) || ORDERS[0];
  const soSt = orderStatus(so);
  const nextSt = FLOW[Math.min(FLOW.indexOf(soSt) + 1, FLOW.length - 1)];
  const advanceLabel = soSt === 'COMPLETED' ? 'Completed' : 'Advance → ' + statusLabel(nextSt);
  const needsVerify = soSt === 'PAYMENT_PENDING_VERIFICATION';
  const pageCountEditable = so.items.some((i) => i.ext === 'DOC');
  const selTotal = orderTotal(so);

  const ruleTitle = so.free
    ? 'FREE delivery — Virat pays the courier'
    : 'COD courier — customer pays the partner';
  const ruleBody = so.free
    ? `Within ${FREE_RADIUS_KM} km and order above ${inr(FREE_MIN_ORDER)}. Book as a prepaid parcel and record the fee below.`
    : 'Book as a cash/COD parcel — delivery charges at actuals, collected by the delivery partner ₹ on receipt.';
  const ruleBoxStyle: CSSProperties = {
    marginTop: '10px',
    borderLeft: '2px solid ' + (so.free ? '#1F6B3E' : '#F5821F'),
    color: so.free ? '#1F6B3E' : '#8A5A22',
    paddingLeft: '14px',
  };

  const pickupAddr = `${BRANCH.brand} — ${BRANCH.address}`;
  const uberLink =
    `https://m.uber.com/ul/?action=setPickup` +
    `&pickup[latitude]=${BRANCH.lat}&pickup[longitude]=${BRANCH.lng}` +
    `&dropoff[latitude]=${so.dropLat}&dropoff[longitude]=${so.dropLng}`;

  const deliveryStateNote =
    soSt === 'OUT_FOR_DELIVERY'
      ? `Booked with ${vendor}${trackingId ? ' · ' + trackingId : ''}${
          courierFee ? ' · fee ₹' + courierFee : ''
        }. Customer emailed.`
      : 'No booking recorded yet for this order.';

  const repriceNote = repriced
    ? `Repriced to ${inr(Number(verifiedPages) * 2 * 3 + 150)} · customer notified by email`
    : 'Customer entered ~120 pages';
  const repriceOrder = () => {
    const newTotal = Number(verifiedPages) * 2 * 3 + 150;
    setTotalOverrides((prev) => ({ ...prev, [so.no]: newTotal }));
    setRepriced(true);
  };

  const vendorChips: { key: typeof vendor; label: string }[] = [
    { key: 'uber', label: 'Uber' },
    { key: 'rapido', label: 'Rapido' },
    { key: 'other', label: 'Other' },
  ];

  return (
    <div
      className="admin-page"
      style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 32px 96px' }}
    >
      <style>{`@media(max-width:720px){
        .admin-body-grid{grid-template-columns:1fr !important;}
        .admin-detail-grid{grid-template-columns:1fr !important;}
      }`}</style>

      {/* header */}
      <div
        className="admin-header"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
          borderBottom: '1px solid #E7E4DC',
          paddingBottom: '22px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
            ORDERS DASHBOARD
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-.025em' }}>
            Mukund Nagar
          </h1>
          <div style={{ fontSize: '13px', color: '#8A8578', marginTop: '5px' }}>
            Live queue · Realtime activates with Supabase · staff@virat.co.in
          </div>
          <div style={{ fontSize: '12px', color: '#B0AB9F', marginTop: '4px' }}>
            Demo data — live Realtime streaming activates once Supabase is configured.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStaffFilter(f.key)} style={chipStyle(staffFilter === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* body grid */}
      <div
        className="admin-body-grid"
        style={{
          marginTop: '28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px,340px) minmax(0,1fr)',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* LEFT queue */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {queue.length === 0 && (
            <div style={{ fontSize: '13px', color: '#8A8578', padding: '16px 0' }}>
              No orders in this view.
            </div>
          )}
          {queue.map((o) => {
            const st = orderStatus(o);
            const selected = o.no === expandedId;
            const summary =
              o.items[0].file +
              (o.items.length > 1 ? ` +${o.items.length - 1} file` : '') +
              ` · ${o.sheets} sheets`;
            return (
              <button
                key={o.no}
                onClick={() => selectOrder(o.no)}
                style={{
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  background: selected ? '#fff' : 'transparent',
                  padding: '16px',
                  border: 0,
                  borderLeft: '2px solid ' + (selected ? '#1B3A6B' : 'transparent'),
                  borderBottom: '1px solid #E7E4DC',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#1B3A6B' }}>
                    {o.no}
                  </div>
                  <div style={pill(st)}>{statusLabel(st)}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: '8px',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{o.name}</div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800 }}>{inr(orderTotal(o))}</div>
                </div>
                <div style={{ fontSize: '12.5px', color: '#8A8578', marginTop: '4px', lineHeight: 1.45 }}>
                  {summary}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11.5px', color: '#8A8578' }}>
                  <div>{o.delivery}</div>
                  <div>·</div>
                  <div>{o.age}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT detail card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <div style={{ border: '1px solid #E7E4DC', borderRadius: '8px', background: '#fff', minWidth: 0 }}>
            {/* detail header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E7E4DC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>
                  {so.no}
                </div>
                <div style={{ fontSize: '13px', color: '#8A8578', marginTop: '4px' }}>
                  {so.name} · {so.phone} · {so.age}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={pill(soSt)}>{statusLabel(soSt)}</div>
                {needsVerify && (
                  <button
                    onClick={() => setStatus(so.no, 'PAID')}
                    style={{
                      background: '#1F6B3E',
                      color: '#fff',
                      border: 0,
                      borderRadius: '6px',
                      padding: '9px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Verify payment
                  </button>
                )}
                <button
                  className="h-blue"
                  onClick={() => setStatus(so.no, nextSt)}
                  style={{
                    background: '#1B3A6B',
                    color: '#fff',
                    border: 0,
                    borderRadius: '6px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {advanceLabel}
                </button>
                <button
                  className="h-outline"
                  onClick={() => setStatus(so.no, 'CANCELLED')}
                  style={{
                    background: 'none',
                    border: '1px solid #D8D2C4',
                    color: '#B23B3B',
                    borderRadius: '6px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* detail body grid */}
            <div
              className="admin-detail-grid"
              style={{
                padding: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(272px,1fr))',
                gap: '28px',
                alignItems: 'start',
              }}
            >
              {/* JOB TICKET column */}
              <div
                className="mono"
                style={{
                  background: '#FCFCFA',
                  border: '1px dashed #B9BEC7',
                  borderRadius: '6px',
                  padding: '18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px dashed #C9CDD4',
                    paddingBottom: '9px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.08em' }}>JOB TICKET</div>
                  <div style={{ fontSize: '10px' }}>A5 slip</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '10px' }}>{so.no}</div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>{so.placedAt}</div>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {so.items.map((it, k) => (
                    <div key={k} style={{ borderTop: '1px dotted #C9CDD4', paddingTop: '8px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, wordBreak: 'break-all' }}>{it.file}</div>
                      <div style={{ fontSize: '11px', marginTop: '3px', lineHeight: 1.5 }}>{it.spec}</div>
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>{it.pagesLine}</div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: '1px dashed #C9CDD4',
                    marginTop: '10px',
                    paddingTop: '9px',
                    fontSize: '11.5px',
                    lineHeight: 1.6,
                  }}
                >
                  <div>Finishing: {so.finishing}</div>
                  <div>Handover: {so.delivery.startsWith('Pickup') ? 'Pickup' : 'Delivery'}</div>
                  <div>Payment: {so.pay}</div>
                </div>
                <div
                  style={{
                    borderTop: '1px dashed #C9CDD4',
                    marginTop: '9px',
                    paddingTop: '9px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <div>TOTAL</div>
                  <div>{inr(selTotal)}</div>
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '9.5px',
                    letterSpacing: '.06em',
                    textAlign: 'center',
                    color: '#8A8578',
                  }}
                >
                  VIRAT ENTERPRISES · NAAM HI KAAFI HAI
                </div>
                <button
                  className="h-white"
                  onClick={() => window.print()}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #D8D2C4',
                    borderRadius: '6px',
                    padding: '9px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-jakarta), sans-serif',
                  }}
                >
                  Print ticket
                </button>
              </div>

              {/* RIGHT column */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#8A8578' }}>
                  FILES
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
                  {so.items.map((it, k) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        borderBottom: '1px solid #F0EDE5',
                        padding: '11px 0',
                      }}
                    >
                      <div style={fileBadge(it.ext)}>{it.ext}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {it.file}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#8A8578', marginTop: '2px' }}>{it.spec}</div>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>{it.lineTotal}</div>
                      <button
                        className="h-ink"
                        onClick={(e) => e.preventDefault()}
                        style={{
                          background: 'none',
                          border: 0,
                          color: '#1B3A6B',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>

                {pageCountEditable && (
                  <div style={{ marginTop: '14px', borderLeft: '2px solid #F5821F', paddingLeft: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A5A22' }}>
                      Office file — page count from customer. Verify and correct:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '9px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min={1}
                        value={verifiedPages}
                        onChange={(e) => setVerifiedPages(e.target.value)}
                        style={{
                          width: '90px',
                          padding: '9px 11px',
                          border: '1px solid #D8D2C4',
                          borderRadius: '6px',
                          background: '#fff',
                        }}
                      />
                      <button
                        onClick={repriceOrder}
                        style={{
                          background: 'none',
                          border: '1px solid #8A5A22',
                          color: '#8A5A22',
                          borderRadius: '6px',
                          padding: '9px 13px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Reprice &amp; notify customer
                      </button>
                      <div style={{ fontSize: '12px', color: '#8A8578' }}>{repriceNote}</div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '24px', fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#8A8578' }}>
                  BOOK DELIVERY
                </div>
                <div style={ruleBoxStyle}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{ruleTitle}</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px', lineHeight: 1.55 }}>{ruleBody}</div>
                </div>

                {/* pickup & drop address cards */}
                <div
                  style={{
                    marginTop: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
                    gap: '12px',
                  }}
                >
                  <div style={{ border: '1px solid #E7E4DC', borderRadius: '6px', padding: '13px', minWidth: 0 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
                      PICKUP
                    </div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.5, marginTop: '7px' }}>{pickupAddr}</div>
                    <button
                      onClick={() => copy(BRANCH.address, 'pickup')}
                      style={{
                        marginTop: '10px',
                        background: 'none',
                        border: 0,
                        padding: 0,
                        color: '#1B3A6B',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {copied === 'pickup' ? 'Copied ✓' : 'Copy address'}
                    </button>
                  </div>
                  <div style={{ border: '1px solid #E7E4DC', borderRadius: '6px', padding: '13px', minWidth: 0 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
                      DROP
                    </div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.5, marginTop: '7px' }}>{so.drop}</div>
                    <button
                      onClick={() => copy(so.drop, 'drop')}
                      style={{
                        marginTop: '10px',
                        background: 'none',
                        border: 0,
                        padding: 0,
                        color: '#1B3A6B',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {copied === 'drop' ? 'Copied ✓' : 'Copy address'}
                    </button>
                  </div>
                </div>

                {/* courier deep links */}
                <div style={{ marginTop: '14px', display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                  <a
                    href={uberLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#1A1A1A',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '10px 14px',
                      borderRadius: '6px',
                    }}
                  >
                    Open Uber parcel ↗
                  </a>
                  <a
                    href="https://m.rapido.bike"
                    target="_blank"
                    rel="noreferrer"
                    className="h-outline"
                    style={{
                      background: 'none',
                      border: '1px solid #1A1A1A',
                      color: '#1A1A1A',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      padding: '9px 14px',
                      borderRadius: '6px',
                    }}
                  >
                    Open Rapido ↗
                  </a>
                </div>

                {/* vendor + tracking + fee + actions */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
                      VENDOR
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                      {vendorChips.map((v) => (
                        <button key={v.key} onClick={() => setVendor(v.key)} style={smallChip(vendor === v.key)}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
                      TRACKING ID
                    </div>
                    <input
                      type="text"
                      placeholder="optional"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      style={{
                        marginTop: '7px',
                        width: '140px',
                        padding: '9px 11px',
                        border: '1px solid #D8D2C4',
                        borderRadius: '6px',
                        background: '#fff',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
                      COURIER FEE ₹
                    </div>
                    <input
                      type="number"
                      placeholder="0"
                      value={courierFee}
                      onChange={(e) => setCourierFee(e.target.value)}
                      style={{
                        marginTop: '7px',
                        width: '100px',
                        padding: '9px 11px',
                        border: '1px solid #D8D2C4',
                        borderRadius: '6px',
                        background: '#fff',
                      }}
                    />
                  </div>
                  <button
                    className="h-orange"
                    onClick={() => setStatus(so.no, 'OUT_FOR_DELIVERY')}
                    style={{
                      background: '#F5821F',
                      color: '#fff',
                      border: 0,
                      borderRadius: '6px',
                      padding: '10px 15px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark out for delivery
                  </button>
                  <button
                    onClick={() => setStatus(so.no, 'COMPLETED')}
                    style={{
                      background: 'none',
                      border: '1px solid #1F6B3E',
                      color: '#1F6B3E',
                      borderRadius: '6px',
                      padding: '9px 15px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark delivered
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#8A8578', marginTop: '10px' }}>{deliveryStateNote}</div>
              </div>
            </div>

            {/* AUDIT TRAIL footer */}
            <div style={{ padding: '18px 24px', borderTop: '1px solid #E7E4DC' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#8A8578' }}>
                AUDIT TRAIL
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {so.events.map((e, k) => (
                  <div key={k} style={{ display: 'flex', gap: '14px', fontSize: '12.5px', alignItems: 'baseline' }}>
                    <div className="mono" style={{ color: '#B0AB9F', width: '48px', flex: 'none' }}>
                      {e.time}
                    </div>
                    <div style={{ fontWeight: 700, width: '210px', flex: 'none' }}>{statusLabel(e.status)}</div>
                    <div style={{ color: '#8A8578' }}>{e.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
