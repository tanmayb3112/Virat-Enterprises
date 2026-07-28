'use client';

import { useState, useRef, useEffect, useCallback, useMemo, CSSProperties } from 'react';
import { inr } from '@/lib/format';
import { BRANCHES } from '@/lib/data';
import { computeFileCost } from '@/lib/pricing';
import {
  DbOrder,
  OFFICE_EXT,
  extOf,
  toOrderFile,
  describePrefs,
  accessToken,
  fetchOrders,
} from '@/lib/orders';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import AdminGate from '@/components/AdminGate';

// ---------------------------------------------------------------------------
// Staff orders dashboard — /admin
// LIVE: orders stream from Supabase via /api/admin/orders (service role behind a
// staff check). Mutations persist and write order_events, so the audit trail is
// real history. Realtime pushes changes to every open counter screen; a 20s poll
// backs it up in case the Realtime socket cannot connect.
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

// --- the view model the markup below renders --------------------------------
interface FileItem {
  file: string;
  ext: string;
  spec: string;
  pagesLine: string;
  lineTotal: string;
  isOffice: boolean;
  pages: number;
}
interface AuditEvent {
  time: string;
  status: Status;
  note: string;
}
interface Order {
  id: string;
  no: string;
  branchId: string | null;
  name: string;
  phone: string;
  status: Status;
  total: number;
  itemsSum: number;
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

// --- mapping ----------------------------------------------------------------
function relativeAge(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function stamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function asStatus(s: string): Status {
  return (FLOW as string[]).includes(s) || s === 'CANCELLED' ? (s as Status) : 'RECEIVED';
}

function addressLine(o: DbOrder, branchLabel: string): string {
  if (o.delivery_type !== 'delivery' || !o.address) return `Pickup at ${branchLabel} counter`;
  const a = o.address as Record<string, string | number | undefined>;
  return (
    [a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(', ') ||
    'Delivery address not captured'
  );
}

function paymentLine(o: DbOrder): string {
  const mode = o.payment_mode === 'razorpay' ? 'Razorpay' : 'UPI';
  if (o.utr_reference) {
    return `${mode} · UTR ${o.utr_reference}${
      o.payment_status === 'paid' ? ' · verified' : ' — unverified'
    }`;
  }
  if (o.payment_status === 'paid') return `${mode} · verified`;
  return `${mode} · not provided yet`;
}

function finishingLine(o: DbOrder): string {
  const bits: string[] = [];
  const b = o.binding;
  if (b && b !== 'none') {
    bits.push(
      b === 'spiral'
        ? 'Spiral binding'
        : b === 'hard'
          ? 'Hard binding (blackbook)'
          : b === 'rexine'
            ? 'Rexine binding'
            : b === 'staple'
              ? 'Staple'
              : b
    );
  }
  if (o.lamination && o.lamination !== 'none') bits.push('Lamination (per page)');
  return bits.length ? bits.join(' · ') : 'None';
}

function toView(o: DbOrder): Order {
  const branch = BRANCHES.find((b) => b.id === o.branch_id);
  const branchLabel = branch?.name ?? 'the';
  const dbItems = o.items ?? [];

  const items: FileItem[] = dbItems.map((it) => {
    const of = toOrderFile(it);
    const cost = computeFileCost(of);
    const name = it.file_name ?? 'file';
    const ext = extOf(name);
    return {
      file: name,
      ext,
      spec: describePrefs(of.prefs),
      pagesLine: cost.hasPages
        ? `${cost.pages} pages → ${cost.totalSides} sides, ${cost.sheets} sheets`
        : 'Page count not known yet — verify',
      lineTotal: inr(it.line_total ?? cost.lineTotal),
      isOffice: OFFICE_EXT.includes(ext),
      pages: of.pages,
    };
  });

  const sheets = dbItems.reduce((n, it) => n + computeFileCost(toOrderFile(it)).sheets, 0);
  const itemsSum = dbItems.reduce((n, it) => n + Number(it.line_total ?? 0), 0);

  // Order creation does not write an order_events row, so the "created" line is
  // synthesised from created_at and the real events are appended after it.
  const created: AuditEvent = {
    time: clockTime(o.created_at),
    status: 'RECEIVED',
    note:
      'Order created' +
      (o.utm?.utm_source ? ` · utm_source=${o.utm.utm_source}` : '') +
      (o.guest_email ? ` · ${o.guest_email}` : ''),
  };
  const events: AuditEvent[] = [
    created,
    ...[...(o.order_events ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((e) => ({
        time: clockTime(e.created_at),
        status: asStatus(e.status ?? 'RECEIVED'),
        note: (e.note ?? '') + (e.actor ? ` · ${e.actor}` : ''),
      })),
  ];

  const free = o.delivery_fee_rule === 'free';
  const delivery =
    o.delivery_type === 'delivery'
      ? `Delivery${o.distance_km ? ` · ${o.distance_km.toFixed(1)} km` : ''}${free ? ' · FREE' : ''}`
      : 'Pickup';

  const addr = (o.address ?? {}) as Record<string, number | undefined>;

  return {
    id: o.id,
    no: o.order_no,
    branchId: o.branch_id,
    name: o.guest_name || 'Customer',
    phone: o.guest_phone || '—',
    status: asStatus(o.status),
    total: Number(o.total ?? 0),
    itemsSum,
    sheets,
    age: relativeAge(o.created_at),
    placedAt: stamp(o.created_at),
    delivery,
    pay: paymentLine(o),
    drop: addressLine(o, branchLabel),
    dropLat: Number(addr.lat ?? branch?.lat ?? 18.5011),
    dropLng: Number(addr.lng ?? branch?.lng ?? 73.8756),
    free,
    finishing: finishingLine(o),
    items,
    events,
  };
}

// --- shared style helpers (unchanged) --------------------------------------
function statusLabel(s: Status): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^./, (m) => m.toUpperCase());
}

const PILL_MAP: Record<Status, [string, string]> = {
  RECEIVED: ['#1C2836', '#9DC1F0'],
  PAYMENT_PENDING_VERIFICATION: ['#33270E', '#E8B25C'],
  PAID: ['#152B1C', '#7ED09A'],
  PRINTING: ['#241D38', '#C4B1F5'],
  READY: ['#132831', '#8FD0E8'],
  OUT_FOR_DELIVERY: ['#33240D', '#F5C173'],
  COMPLETED: ['#26261F', '#B9B6AC'],
  CANCELLED: ['#331717', '#F09A9A'],
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
function fileBadge(ext: string): CSSProperties {
  const c = ext.startsWith('PDF')
    ? '#F08A8A'
    : ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext)
      ? '#6FCF8E'
      : '#FFC400';
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
    background: '#1C1C18',
  };
}
function chipStyle(active: boolean): CSSProperties {
  return active
    ? {
        padding: '9px 15px',
        borderRadius: '6px',
        border: '1px solid #FFC400',
        background: '#FFC400',
        color: '#111',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }
    : {
        padding: '9px 15px',
        borderRadius: '6px',
        border: '1px solid #3E3E36',
        background: '#1C1C18',
        color: '#F2F0E9',
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
        border: '1px solid #FFC400',
        background: '#FFC400',
        color: '#111',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }
    : {
        padding: '7px 12px',
        borderRadius: '6px',
        border: '1px solid #3E3E36',
        background: '#1C1C18',
        color: '#F2F0E9',
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

const FREE_RADIUS_KM = 3;
const FREE_MIN_ORDER = 500;

function AdminOrdersInner() {
  const { user, live } = useAuth();

  const [rows, setRows] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [lastSync, setLastSync] = useState<string>('');

  const [staffFilter, setStaffFilter] = useState<'all' | Status>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string>('');
  const [copied, setCopied] = useState<'' | 'pickup' | 'drop'>('');
  const [verifiedPages, setVerifiedPages] = useState<string>('');
  const [vendor, setVendor] = useState<'uber' | 'rapido' | 'other'>('uber');
  const [trackingId, setTrackingId] = useState('');
  const [courierFee, setCourierFee] = useState('');
  const [files, setFiles] = useState<{ name: string; url: string | null }[] | null>(null);
  const [filesBusy, setFilesBusy] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetchOrders();
    setLoadError(res.error);
    if (res.ok) {
      setRows(res.orders);
      setLastSync(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!live) {
      setLoading(false);
      return;
    }
    load();
  }, [live, load]);

  // Realtime, with a poll as the safety net: if the socket cannot connect (RLS,
  // network, Realtime disabled on the project) the queue still refreshes.
  useEffect(() => {
    if (!live) return;
    const supabase = getSupabaseBrowser();
    const poll = setInterval(load, 20000);
    if (!supabase) return () => clearInterval(poll);

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe((status) => setStreaming(status === 'SUBSCRIBED'));

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [live, load]);

  const orders = useMemo(() => rows.map(toView), [rows]);

  const queue = orders.filter((o) => {
    if (branchFilter !== 'all' && o.branchId !== branchFilter) return false;
    if (staffFilter === 'all') return o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
    return o.status === staffFilter;
  });

  const so = orders.find((o) => o.id === expandedId) ?? queue[0] ?? orders[0] ?? null;

  // Branches actually represented in the queue, for the branch filter.
  const branchesPresent = useMemo(() => {
    const ids = new Set(orders.map((o) => o.branchId).filter(Boolean) as string[]);
    return BRANCHES.filter((b) => ids.has(b.id));
  }, [orders]);

  const mutate = useCallback(
    async (payload: Record<string, unknown>, label: string) => {
      const token = await accessToken();
      if (!token) return;
      setBusyAction(label);
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const out = await res.json();
        if (!out.ok) setLoadError(`Action failed: ${out.error ?? res.status}`);
        else setLoadError('');
        await load();
      } catch (e) {
        setLoadError(`Action failed: ${String(e)}`);
      } finally {
        setBusyAction('');
      }
    },
    [load]
  );

  const copy = (text: string, key: 'pickup' | 'drop') => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(''), 1600);
  };

  const selectOrder = (id: string) => {
    setExpandedId(id);
    setVerifiedPages('');
    setFiles(null);
  };

  const loadFiles = async () => {
    if (!so) return;
    const token = await accessToken();
    if (!token) return;
    setFilesBusy(true);
    try {
      const res = await fetch('/api/admin/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: so.id }),
      });
      const out = await res.json();
      if (out.ok) setFiles(out.files);
      else
        setLoadError(
          out.error === 'files_purged'
            ? 'These files were purged by the 7-day retention job.'
            : `Could not prepare downloads: ${out.error}`
        );
    } catch (e) {
      setLoadError(`Could not prepare downloads: ${String(e)}`);
    } finally {
      setFilesBusy(false);
    }
  };

  // --- states before the dashboard proper ---------------------------------
  if (!live) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '64px 24px 120px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
          ORDERS DASHBOARD
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#F2F0E9', margin: '12px 0' }}>
          Database not connected
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: '#C9C6BC' }}>
          This dashboard shows real orders from Supabase. Add the Supabase environment
          variables in Vercel and redeploy to activate it.
        </p>
      </div>
    );
  }

  const soSt = so?.status ?? 'RECEIVED';
  const nextSt = FLOW[Math.min(FLOW.indexOf(soSt) + 1, FLOW.length - 1)];
  const advanceLabel = soSt === 'COMPLETED' ? 'Completed' : 'Advance → ' + statusLabel(nextSt);
  const needsVerify = soSt === 'PAYMENT_PENDING_VERIFICATION';
  const pageCountEditable = !!so?.items.some((i) => i.isOffice || i.pages === 0);
  const branch = BRANCHES.find((b) => b.id === so?.branchId) ?? BRANCHES[0];

  const ruleTitle = so?.free
    ? 'FREE delivery — Virat pays the courier'
    : 'COD courier — customer pays the partner';
  const ruleBody = so?.free
    ? `Within ${FREE_RADIUS_KM} km and order above ${inr(FREE_MIN_ORDER)}. Book as a prepaid parcel and record the fee below.`
    : 'Book as a cash/COD parcel — delivery charges at actuals, collected by the delivery partner ₹ on receipt.';
  const ruleBoxStyle: CSSProperties = {
    marginTop: '10px',
    borderLeft: '2px solid ' + (so?.free ? '#6FCF8E' : '#E8B25C'),
    color: so?.free ? '#6FCF8E' : '#E8B25C',
    paddingLeft: '14px',
  };

  const pickupAddr = `${branch.brand} — ${branch.address}`;
  const uberLink =
    `https://m.uber.com/ul/?action=setPickup` +
    `&pickup[latitude]=${branch.lat}&pickup[longitude]=${branch.lng}` +
    `&dropoff[latitude]=${so?.dropLat ?? branch.lat}&dropoff[longitude]=${so?.dropLng ?? branch.lng}`;

  // Rebooking a parcel adds a row rather than replacing one, so show the latest.
  const booking = [...(rows.find((r) => r.id === so?.id)?.deliveries ?? [])].sort((a, b) =>
    (b.booked_at ?? '').localeCompare(a.booked_at ?? '')
  )[0];
  const deliveryStateNote = booking
    ? `Booked with ${booking.vendor ?? 'courier'}${
        booking.tracking_id ? ' · ' + booking.tracking_id : ''
      }${booking.courier_fee != null ? ' · fee ₹' + booking.courier_fee : ''}.`
    : 'No booking recorded yet for this order.';

  // Repricing an office file: recompute the corrected file's line total with the
  // shared pricing engine and swap it into the order total, so binding,
  // lamination and minimum-order effects already in the total are preserved.
  const repriceOrder = () => {
    if (!so) return;
    const pages = Number(verifiedPages);
    if (!Number.isFinite(pages) || pages < 1) return;
    const dbRow = rows.find((r) => r.id === so.id);
    const dbItems = dbRow?.items ?? [];
    const newItemsSum = dbItems.reduce((n, it) => {
      const isOffice = OFFICE_EXT.includes(extOf(it.file_name ?? ''));
      const needsPages = isOffice || !it.page_count;
      const cost = computeFileCost(toOrderFile(it, needsPages ? pages : undefined));
      return n + (needsPages ? cost.lineTotal : Number(it.line_total ?? cost.lineTotal));
    }, 0);
    const newTotal = Math.max(0, Math.round(so.total - so.itemsSum + newItemsSum));
    mutate({ id: so.id, action: 'reprice', total: newTotal, pages }, 'reprice');
  };

  const vendorChips: { key: typeof vendor; label: string }[] = [
    { key: 'uber', label: 'Uber' },
    { key: 'rapido', label: 'Rapido' },
    { key: 'other', label: 'Other' },
  ];

  const headline =
    branchFilter !== 'all'
      ? (BRANCHES.find((b) => b.id === branchFilter)?.name ?? 'Orders')
      : branchesPresent.length === 1
        ? branchesPresent[0].name
        : 'All branches';

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
          borderBottom: '1px solid #2E2E29',
          paddingBottom: '22px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
            ORDERS DASHBOARD
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-.025em', color: '#F2F0E9' }}>
            {headline}
          </h1>
          <div style={{ fontSize: '13px', color: '#9A968A', marginTop: '5px' }}>
            {orders.length} order{orders.length === 1 ? '' : 's'} ·{' '}
            <span style={{ color: streaming ? '#6FCF8E' : '#E8B25C' }}>
              {streaming ? 'Live' : 'Refreshing every 20s'}
            </span>
            {lastSync ? ` · synced ${lastSync}` : ''}
            {user?.email ? ` · ${user.email}` : ''}
          </div>
          <div style={{ fontSize: '12px', color: '#6E6B62', marginTop: '4px' }}>
            <button
              onClick={load}
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                color: '#FFC400',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Refresh now
            </button>
            {' · '}
            <a href="/admin/settings" style={{ color: '#FFC400', fontWeight: 700 }}>
              Settings →
            </a>
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

      {branchesPresent.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => setBranchFilter('all')} style={smallChip(branchFilter === 'all')}>
            All branches
          </button>
          {branchesPresent.map((b) => (
            <button key={b.id} onClick={() => setBranchFilter(b.id)} style={smallChip(branchFilter === b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div
          style={{
            marginTop: '18px',
            borderLeft: '3px solid #F08A8A',
            background: '#1C1C18',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#F08A8A',
            borderRadius: '0 6px 6px 0',
          }}
        >
          {loadError}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px 0', color: '#9A968A', fontSize: '14px' }}>Loading orders…</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '48px 0', maxWidth: 520 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#F2F0E9' }}>No orders yet</div>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#9A968A', marginTop: '8px' }}>
            This queue fills up the moment a customer places an order on the site. Place a
            test order from <a href="/order" style={{ color: '#FFC400', fontWeight: 700 }}>/order</a>{' '}
            to see it land here.
          </p>
        </div>
      ) : (
        /* body grid */
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
              <div style={{ fontSize: '13px', color: '#9A968A', padding: '16px 0' }}>
                No orders in this view.
              </div>
            )}
            {queue.map((o) => {
              const selected = o.id === so?.id;
              const summary =
                (o.items[0]?.file ?? 'No files') +
                (o.items.length > 1 ? ` +${o.items.length - 1} file` : '') +
                ` · ${o.sheets} sheets`;
              return (
                <button
                  key={o.id}
                  onClick={() => selectOrder(o.id)}
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    background: selected ? '#1C1C18' : 'transparent',
                    padding: '16px',
                    border: 0,
                    borderLeft: '2px solid ' + (selected ? '#FFC400' : 'transparent'),
                    borderBottom: '1px solid #2E2E29',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: '#FFC400' }}>
                      {o.no}
                    </div>
                    <div style={pill(o.status)}>{statusLabel(o.status)}</div>
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
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#F2F0E9' }}>{o.name}</div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#F2F0E9' }}>{inr(o.total)}</div>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#9A968A', marginTop: '4px', lineHeight: 1.45 }}>
                    {summary}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11.5px', color: '#9A968A' }}>
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
            {so && (
              <div style={{ border: '1px solid #2E2E29', borderRadius: '8px', background: '#1C1C18', minWidth: 0 }}>
                {/* detail header */}
                <div
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #2E2E29',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 600, color: '#F2F0E9' }}>
                      {so.no}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9A968A', marginTop: '4px' }}>
                      {so.name} · {so.phone} · {so.age}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={pill(soSt)}>{statusLabel(soSt)}</div>
                    {needsVerify && (
                      <button
                        disabled={!!busyAction}
                        onClick={() => mutate({ id: so.id, action: 'verify_payment' }, 'verify')}
                        style={{
                          background: '#2E7D4F',
                          color: '#fff',
                          border: 0,
                          borderRadius: '6px',
                          padding: '9px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {busyAction === 'verify' ? 'Verifying…' : 'Verify payment'}
                      </button>
                    )}
                    <button
                      className="h-blue"
                      disabled={!!busyAction || soSt === 'COMPLETED'}
                      onClick={() => mutate({ id: so.id, action: 'status', status: nextSt }, 'advance')}
                      style={{
                        background: '#FFC400',
                        color: '#111',
                        border: 0,
                        borderRadius: '6px',
                        padding: '9px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: soSt === 'COMPLETED' ? 'default' : 'pointer',
                        opacity: soSt === 'COMPLETED' ? 0.6 : 1,
                      }}
                    >
                      {busyAction === 'advance' ? 'Saving…' : advanceLabel}
                    </button>
                    <button
                      className="h-outline"
                      disabled={!!busyAction}
                      onClick={() => mutate({ id: so.id, action: 'cancel' }, 'cancel')}
                      style={{
                        background: 'none',
                        border: '1px solid #3E3E36',
                        color: '#F08A8A',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {busyAction === 'cancel' ? 'Cancelling…' : 'Cancel'}
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
                      // Paper slip: force dark ink — the dark theme's light body
                      // color must not leak into this deliberately light block.
                      color: '#1A1A1A',
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
                      <div>{inr(so.total)}</div>
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#9A968A' }}>
                        FILES
                      </div>
                      {so.items.length > 0 && (
                        <button
                          onClick={loadFiles}
                          disabled={filesBusy}
                          style={{
                            background: 'none',
                            border: 0,
                            padding: 0,
                            color: '#FFC400',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {filesBusy ? 'Preparing…' : files ? 'Refresh links' : 'Prepare downloads'}
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
                      {so.items.length === 0 && (
                        <div style={{ fontSize: '13px', color: '#9A968A', padding: '8px 0' }}>
                          No files on this order.
                        </div>
                      )}
                      {so.items.map((it, k) => {
                        const link = files?.find((f) => f.name === it.file);
                        return (
                          <div
                            key={k}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              borderBottom: '1px solid #26261F',
                              padding: '11px 0',
                            }}
                          >
                            <div style={fileBadge(it.ext)}>{it.ext}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  color: '#F2F0E9',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {it.file}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#9A968A', marginTop: '2px' }}>{it.spec}</div>
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap', color: '#F2F0E9' }}>
                              {it.lineTotal}
                            </div>
                            {link?.url ? (
                              <a
                                className="h-ink"
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: '#FFC400',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  textDecoration: 'underline',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Download
                              </a>
                            ) : (
                              <span
                                style={{
                                  fontSize: '12.5px',
                                  color: files ? '#F08A8A' : '#6E6B62',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {files ? 'Not uploaded' : '—'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {pageCountEditable && (
                      <div style={{ marginTop: '14px', borderLeft: '2px solid #FFC400', paddingLeft: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#E8B25C' }}>
                          Office file — page count from customer. Verify and correct:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '9px', flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            min={1}
                            value={verifiedPages}
                            onChange={(e) => setVerifiedPages(e.target.value)}
                            placeholder="pages"
                            style={{
                              width: '90px',
                              padding: '9px 11px',
                              border: '1px solid #3E3E36',
                              borderRadius: '6px',
                              background: '#1C1C18',
                              color: '#F2F0E9',
                            }}
                          />
                          <button
                            onClick={repriceOrder}
                            disabled={!verifiedPages || !!busyAction}
                            style={{
                              background: 'none',
                              border: '1px solid #E8B25C',
                              color: '#E8B25C',
                              borderRadius: '6px',
                              padding: '9px 13px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              opacity: verifiedPages ? 1 : 0.5,
                            }}
                          >
                            {busyAction === 'reprice' ? 'Repricing…' : 'Reprice order'}
                          </button>
                          <div style={{ fontSize: '12px', color: '#9A968A' }}>
                            Recalculates at the shop&rsquo;s rates and logs the change.
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '24px', fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#9A968A' }}>
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
                      <div style={{ border: '1px solid #2E2E29', borderRadius: '6px', padding: '13px', minWidth: 0 }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
                          PICKUP
                        </div>
                        <div style={{ fontSize: '12.5px', lineHeight: 1.5, marginTop: '7px', color: '#F2F0E9' }}>{pickupAddr}</div>
                        <button
                          onClick={() => copy(branch.address, 'pickup')}
                          style={{
                            marginTop: '10px',
                            background: 'none',
                            border: 0,
                            padding: 0,
                            color: '#FFC400',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {copied === 'pickup' ? 'Copied ✓' : 'Copy address'}
                        </button>
                      </div>
                      <div style={{ border: '1px solid #2E2E29', borderRadius: '6px', padding: '13px', minWidth: 0 }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
                          DROP
                        </div>
                        <div style={{ fontSize: '12.5px', lineHeight: 1.5, marginTop: '7px', color: '#F2F0E9' }}>{so.drop}</div>
                        <button
                          onClick={() => copy(so.drop, 'drop')}
                          style={{
                            marginTop: '10px',
                            background: 'none',
                            border: 0,
                            padding: 0,
                            color: '#FFC400',
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
                          background: '#F2F0E9',
                          color: '#111',
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
                          border: '1px solid #57544B',
                          color: '#F2F0E9',
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
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
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
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
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
                            border: '1px solid #3E3E36',
                            borderRadius: '6px',
                            background: '#1C1C18',
                            color: '#F2F0E9',
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
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
                            border: '1px solid #3E3E36',
                            borderRadius: '6px',
                            background: '#1C1C18',
                            color: '#F2F0E9',
                          }}
                        />
                      </div>
                      <button
                        className="h-orange"
                        disabled={!!busyAction}
                        onClick={() =>
                          mutate(
                            {
                              id: so.id,
                              action: 'book_delivery',
                              vendor,
                              trackingId,
                              courierFee: courierFee ? Number(courierFee) : undefined,
                            },
                            'book'
                          )
                        }
                        style={{
                          background: '#FFC400',
                          color: '#111',
                          border: 0,
                          borderRadius: '6px',
                          padding: '10px 15px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {busyAction === 'book' ? 'Saving…' : 'Mark out for delivery'}
                      </button>
                      <button
                        disabled={!!busyAction}
                        onClick={() => mutate({ id: so.id, action: 'status', status: 'COMPLETED' }, 'done')}
                        style={{
                          background: 'none',
                          border: '1px solid #6FCF8E',
                          color: '#6FCF8E',
                          borderRadius: '6px',
                          padding: '9px 15px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {busyAction === 'done' ? 'Saving…' : 'Mark delivered'}
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9A968A', marginTop: '10px' }}>{deliveryStateNote}</div>
                  </div>
                </div>

                {/* AUDIT TRAIL footer */}
                <div style={{ padding: '18px 24px', borderTop: '1px solid #2E2E29' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.16em', color: '#9A968A' }}>
                    AUDIT TRAIL
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {so.events.map((e, k) => (
                      <div key={k} style={{ display: 'flex', gap: '14px', fontSize: '12.5px', alignItems: 'baseline' }}>
                        <div className="mono" style={{ color: '#9A968A', width: '48px', flex: 'none' }}>
                          {e.time}
                        </div>
                        <div style={{ fontWeight: 700, width: '210px', flex: 'none', color: '#F2F0E9' }}>
                          {statusLabel(e.status)}
                        </div>
                        <div style={{ color: '#9A968A' }}>{e.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGate>
      <AdminOrdersInner />
    </AdminGate>
  );
}
