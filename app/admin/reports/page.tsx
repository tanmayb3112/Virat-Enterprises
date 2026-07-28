'use client';

import { useState, useEffect, useCallback, useMemo, CSSProperties } from 'react';
import { inr } from '@/lib/format';
import { BRANCHES } from '@/lib/data';
import { computeFileCost, BINDING_COST, LAMINATION_PER_SHEET, Binding } from '@/lib/pricing';
import {
  DbOrder,
  fetchOrders,
  isPaid,
  isCancelled,
  orderTotal,
  sheetsIn,
  serviceOf,
  jobSummary,
  toOrderFile,
  ServiceKey,
} from '@/lib/orders';
import { useAuth } from '@/lib/auth';
import AdminGate from '@/components/AdminGate';

// ---------------------------------------------------------------------------
// Daily report — /admin/reports
// LIVE: every figure is derived from the real orders in the selected date range
// (same /api/admin/orders payload the dashboard uses), so the metric strip, the
// per-branch bars, the service split and the table always reconcile with each
// other and with the queue.
//
// "Received" means payment_status = 'paid', i.e. a human pressed Verify payment
// after finding the money. Billed excludes cancelled orders; cancelled value is
// reported separately as reversed.
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
  const [bg, color] = PILL_MAP[status] ?? PILL_MAP.RECEIVED;
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

type Range = 'today' | 'week' | 'month';

const RANGE_LABELS: Record<Range, string> = {
  today: 'Day',
  week: 'This week',
  month: 'This month',
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// The anchor date plus a range gives the inclusive window the API filters on.
// Weeks run Monday to Sunday, which is how the shop counts them.
function windowFor(anchor: string, range: Range): { from: string; to: string } {
  const d = new Date(`${anchor}T12:00:00`);
  if (range === 'today') return { from: anchor, to: anchor };
  if (range === 'week') {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    const start = new Date(d);
    start.setDate(d.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: iso(start), to: iso(end) };
}

// A report day is a day at the shop, not a UTC day. These turn the local
// calendar boundaries into the instants the API filters created_at on, so an
// order placed at 1am IST lands in that morning's report rather than
// yesterday's.
function dayStartInstant(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function dayEndInstant(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function branchName(id: string | null): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? (id ?? 'Unassigned');
}

function clockTime(isoStamp: string): string {
  return new Date(isoStamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function ReportsInner() {
  const { live } = useAuth();
  const [reportDate, setReportDate] = useState(() => iso(new Date()));
  const [reportRange, setReportRange] = useState<Range>('today');
  const [rows, setRows] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const { from, to } = useMemo(() => windowFor(reportDate, reportRange), [reportDate, reportRange]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchOrders({
      from: dayStartInstant(from),
      to: dayEndInstant(to),
      limit: 2000,
    });
    setRows(res.orders);
    setLoadError(res.error);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    if (!live) {
      setLoading(false);
      return;
    }
    load();
  }, [live, load]);

  const rangeChips: { key: Range; label: string }[] = [
    { key: 'today', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ];

  // --- every figure below is derived from `rows` ---------------------------
  const live_ = rows.filter((r) => !isCancelled(r));
  const cancelled = rows.filter(isCancelled);

  const ordersCount = rows.length;
  const billedTotal = live_.reduce((a, r) => a + orderTotal(r), 0);
  const receivedTotal = live_.filter(isPaid).reduce((a, r) => a + orderTotal(r), 0);
  const gapTotal = billedTotal - receivedTotal;
  const reversedTotal = cancelled.reduce((a, r) => a + orderTotal(r), 0);
  const deliveryFees = rows.reduce(
    (a, r) => a + (r.deliveries ?? []).reduce((n, d) => n + Number(d.courier_fee ?? 0), 0),
    0
  );
  const toChase = live_.filter((r) => !isPaid(r)).length;
  const branchCount = new Set(rows.map((r) => r.branch_id)).size;

  const metrics: { label: string; value: string; sub: string; color?: string }[] = [
    {
      label: 'ORDERS',
      value: String(ordersCount),
      sub: `${branchCount} branch${branchCount === 1 ? '' : 'es'}`,
    },
    { label: 'BILLED', value: inr(billedTotal), sub: 'excludes cancelled' },
    { label: 'RECEIVED', value: inr(receivedTotal), sub: 'verified payments', color: '#6FCF8E' },
    {
      label: 'GAP',
      value: inr(gapTotal),
      sub: `${toChase} order${toChase === 1 ? '' : 's'} to chase`,
      color: gapTotal > 0 ? '#F08A8A' : '#6FCF8E',
    },
    { label: 'DELIVERY FEES', value: inr(deliveryFees), sub: 'courier fees paid' },
    { label: 'CANCELLED', value: String(cancelled.length), sub: inr(reversedTotal) + ' reversed' },
  ];

  // Per branch: billed vs received, biggest first.
  const branchStats = useMemo(() => {
    const m = new Map<string, { name: string; billed: number; received: number }>();
    for (const r of live_) {
      const name = branchName(r.branch_id);
      const cur = m.get(name) ?? { name, billed: 0, received: 0 };
      cur.billed += orderTotal(r);
      if (isPaid(r)) cur.received += orderTotal(r);
      m.set(name, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.billed - a.billed);
  }, [live_]);

  // Top services: printing split by rate-card line from each file's own prefs,
  // plus binding and lamination priced from the shared engine.
  const topServices = useMemo(() => {
    const m = new Map<ServiceKey, number>();
    const add = (k: ServiceKey, amount: number) => m.set(k, (m.get(k) ?? 0) + amount);
    for (const r of live_) {
      for (const it of r.items ?? []) {
        const cost = computeFileCost(toOrderFile(it));
        add(serviceOf(it), Number(it.line_total ?? cost.lineTotal));
      }
      const b = (r.binding ?? 'none') as Binding;
      if (b !== 'none' && BINDING_COST[b]) add('Binding & finishing', BINDING_COST[b]);
      if (r.lamination === 'perpage') add('Lamination', sheetsIn(r) * LAMINATION_PER_SHEET);
    }
    return Array.from(m.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [live_]);

  // Mismatches: unverified money first, then cancellations that took payment.
  const mismatches = useMemo(() => {
    const unpaid = live_
      .filter((r) => !isPaid(r))
      .sort((a, b) => orderTotal(b) - orderTotal(a))
      .map((r) => ({
        title: `${branchName(r.branch_id)} — gap ${inr(orderTotal(r))}`,
        body: r.utr_reference
          ? `${r.order_no} — UTR ${r.utr_reference} submitted, verify in the bank app.`
          : `${r.order_no} — no payment reference submitted yet.`,
      }));
    const refunds = cancelled
      .filter(isPaid)
      .map((r) => ({
        title: `${branchName(r.branch_id)} — refund ${inr(orderTotal(r))}`,
        body: `${r.order_no} was paid then cancelled — refund due.`,
      }));
    return [...refunds, ...unpaid].slice(0, 8);
  }, [live_, cancelled]);

  const maxB = Math.max(1, ...branchStats.map((x) => Math.max(x.billed, x.received)));
  const maxSvc = Math.max(1, ...topServices.map((x) => x.amount));
  const rangeLabel = RANGE_LABELS[reportRange];

  const exportCsv = () => {
    const header = ['time', 'date', 'order', 'branch', 'job', 'billed', 'received', 'status'];
    const body = rows.map((r) => [
      clockTime(r.created_at),
      r.created_at.slice(0, 10),
      r.order_no,
      branchName(r.branch_id),
      '"' + jobSummary(r).replace(/"/g, '""') + '"',
      String(orderTotal(r)),
      String(isPaid(r) ? orderTotal(r) : 0),
      r.status,
    ]);
    const csv = [header, ...body].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `virat-report-${from}${from === to ? '' : `-to-${to}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!live) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '64px 24px 120px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
          REPORTS
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#F2F0E9', margin: '12px 0' }}>
          Database not connected
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: '#C9C6BC' }}>
          Reports are computed from real orders. Add the Supabase environment variables in
          Vercel and redeploy to activate them.
        </p>
      </div>
    );
  }

  return (
    <div
      className="reports-page"
      style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 32px 96px' }}
    >
      <style>{`@media(max-width:720px){
        .reports-metric-strip{grid-template-columns:1fr 1fr !important;}
        .reports-metric-cell{border-bottom:1px solid #26261F;}
        .reports-two-col{grid-template-columns:1fr !important;}
      }`}</style>

      {/* header */}
      <div
        className="reports-header"
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
            REPORTS
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-.025em', color: '#F2F0E9' }}>
            Billed vs received
          </h1>
          <div style={{ fontSize: '13px', color: '#9A968A', marginTop: '5px' }}>
            {from === to ? from : `${from} → ${to}`} · {ordersCount} order
            {ordersCount === 1 ? '' : 's'} · received = payments staff have verified
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
              Refresh
            </button>
            {' · '}
            <a href="/admin" style={{ color: '#FFC400', fontWeight: 700 }}>
              ← Orders queue
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              padding: '9px 12px',
              border: '1px solid #3E3E36',
              borderRadius: '6px',
              background: '#1C1C18',
              color: '#F2F0E9',
              fontSize: '13px',
            }}
          />
          {rangeChips.map((c) => (
            <button key={c.key} onClick={() => setReportRange(c.key)} style={smallChip(reportRange === c.key)}>
              {c.label}
            </button>
          ))}
          <button
            className="h-blue"
            onClick={exportCsv}
            disabled={rows.length === 0}
            style={{
              background: '#FFC400',
              color: '#111',
              border: 0,
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: rows.length === 0 ? 0.5 : 1,
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

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
        <div style={{ padding: '48px 0', color: '#9A968A', fontSize: '14px' }}>Loading report…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '48px 0', maxWidth: 520 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#F2F0E9' }}>
            No orders in this period
          </div>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#9A968A', marginTop: '8px' }}>
            Nothing was billed between {from} and {to}. Pick another date, or widen the range to
            Week or Month.
          </p>
        </div>
      ) : (
        <>
          {/* metric strip */}
          <div
            className="reports-metric-strip"
            style={{
              marginTop: '28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(6,1fr)',
              gap: 0,
              border: '1px solid #2E2E29',
              background: '#1C1C18',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="reports-metric-cell"
                style={{ padding: '18px 20px', borderLeft: i === 0 ? '0' : '1px solid #26261F' }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#9A968A' }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    marginTop: '6px',
                    letterSpacing: '-.02em',
                    color: m.color || '#F2F0E9',
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: '11.5px', color: '#9A968A', marginTop: '2px' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* two-column */}
          <div
            className="reports-two-col"
            style={{
              marginTop: '28px',
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
              gap: '28px',
              alignItems: 'start',
            }}
          >
            {/* LEFT: per branch */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
                  PER BRANCH
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9A968A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', background: '#FFC400', display: 'inline-block' }} />
                    Billed
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', background: '#FFFFFF', display: 'inline-block' }} />
                    Received
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  borderTop: '1px solid #2E2E29',
                  paddingTop: '20px',
                }}
              >
                {branchStats.length === 0 && (
                  <div style={{ fontSize: '13px', color: '#9A968A' }}>
                    Every order in this period was cancelled.
                  </div>
                )}
                {branchStats.map((b) => {
                  const matched = b.received >= b.billed;
                  return (
                    <div key={b.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700, color: '#F2F0E9' }}>{b.name}</div>
                        <div
                          className="mono"
                          style={{ fontSize: '12px', fontWeight: 700, color: matched ? '#6FCF8E' : '#F08A8A' }}
                        >
                          {matched ? 'matched' : 'gap ' + inr(b.billed - b.received)}
                        </div>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '12px', background: '#26261F' }}>
                            <div
                              style={{
                                width: Math.round((b.billed / maxB) * 100) + '%',
                                height: '100%',
                                background: '#FFC400',
                              }}
                            />
                          </div>
                          <div
                            className="mono"
                            style={{ width: '80px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: '#F2F0E9' }}
                          >
                            {inr(b.billed)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '12px', background: '#26261F' }}>
                            <div
                              style={{
                                width: Math.round((b.received / maxB) * 100) + '%',
                                height: '100%',
                                background: '#FFFFFF',
                              }}
                            />
                          </div>
                          <div
                            className="mono"
                            style={{ width: '80px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: '#F2F0E9' }}
                          >
                            {inr(b.received)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: top services + mismatches */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
                TOP SERVICES
              </div>
              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderTop: '1px solid #2E2E29',
                  paddingTop: '20px',
                }}
              >
                {topServices.length === 0 && (
                  <div style={{ fontSize: '13px', color: '#9A968A' }}>
                    No priced line items in this period.
                  </div>
                )}
                {topServices.map((s, i) => (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, color: '#F2F0E9' }}>{s.name}</div>
                      <div className="mono" style={{ fontWeight: 700, color: '#F2F0E9' }}>
                        {inr(s.amount)}
                      </div>
                    </div>
                    <div style={{ marginTop: '6px', height: '8px', background: '#26261F' }}>
                      <div
                        style={{
                          width: Math.round((s.amount / maxSvc) * 100) + '%',
                          height: '100%',
                          background: i === 0 ? '#FFC400' : '#6E6B62',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
                  MISMATCHES TO CHASE
                </div>
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mismatches.length === 0 ? (
                    <div style={{ borderLeft: '2px solid #6FCF8E', paddingLeft: '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#6FCF8E' }}>
                        All settled
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#C9C6BC', marginTop: '3px', lineHeight: 1.5 }}>
                        Every order in this period is paid and verified.
                      </div>
                    </div>
                  ) : (
                    mismatches.map((m, k) => (
                      <div key={k} style={{ borderLeft: '2px solid #F08A8A', paddingLeft: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#F08A8A' }}>{m.title}</div>
                        <div style={{ fontSize: '12.5px', color: '#C9C6BC', marginTop: '3px', lineHeight: 1.5 }}>
                          {m.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* orders table */}
          <div style={{ marginTop: '40px', overflowX: 'auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#9A968A' }}>
              ORDERS — {rangeLabel.toUpperCase()}
            </div>
            <div style={{ marginTop: '16px', minWidth: '1020px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 190px 140px minmax(220px,1fr) 90px 90px 180px',
                  gap: '14px',
                  padding: '0 0 10px',
                  borderBottom: '1px solid #F2F0E9',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '.12em',
                  color: '#9A968A',
                }}
              >
                <div>TIME</div>
                <div>ORDER</div>
                <div>BRANCH</div>
                <div>JOB</div>
                <div style={{ textAlign: 'right' }}>BILLED</div>
                <div style={{ textAlign: 'right' }}>RECEIVED</div>
                <div>STATUS</div>
              </div>
              {rows.map((r) => {
                const paid = isPaid(r);
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '64px 190px 140px minmax(220px,1fr) 90px 90px 180px',
                      gap: '14px',
                      padding: '13px 0',
                      borderBottom: '1px solid #26261F',
                      fontSize: '13px',
                      alignItems: 'center',
                    }}
                  >
                    <div className="mono" style={{ color: '#C9C6BC', fontSize: '12px' }}>
                      {clockTime(r.created_at)}
                    </div>
                    <div className="mono" style={{ fontSize: '11.5px', color: '#C9C6BC' }}>
                      {r.order_no}
                    </div>
                    <div style={{ color: '#F2F0E9' }}>{branchName(r.branch_id)}</div>
                    <div style={{ color: '#C9C6BC' }}>{jobSummary(r)}</div>
                    <div className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '12.5px', color: '#F2F0E9' }}>
                      {inr(orderTotal(r))}
                    </div>
                    <div
                      className="mono"
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        color: paid ? '#6FCF8E' : '#F08A8A',
                      }}
                    >
                      {paid ? inr(orderTotal(r)) : '—'}
                    </div>
                    <div>
                      <span style={pill(r.status as Status)}>{statusLabel(r.status as Status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AdminGate>
      <ReportsInner />
    </AdminGate>
  );
}
