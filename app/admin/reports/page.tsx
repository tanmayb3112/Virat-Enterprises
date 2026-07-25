'use client';

import { useState, CSSProperties } from 'react';
import { inr } from '@/lib/format';

// ---------------------------------------------------------------------------
// Daily report — /admin/reports
// DEMO PAGE: figures below are computed from a realistic hard-coded orders
// array. In production these rows come from Supabase and the end-of-day
// summary emails are sent via a cron job.
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

interface ReportRow {
  time: string;
  no: string;
  branch: string;
  job: string;
  billed: number;
  received: number;
  fee: number;
  status: Status;
}

const REPORT_ROWS: ReportRow[] = [
  { time: '10:12', no: 'VE-MUK-202607-0142', branch: 'Mukund Nagar', job: 'Assignment 24 pp A4 B/W ×2 + colour cover', billed: 486, received: 486, fee: 0, status: 'PAID' },
  { time: '10:05', no: 'VE-MUK-202607-0141', branch: 'Mukund Nagar', job: 'Report ~120 pp A4 B/W ×3, hard binding', billed: 1240, received: 0, fee: 0, status: 'PAYMENT_PENDING_VERIFICATION' },
  { time: '9:52', no: 'VE-ABC-202607-0088', branch: 'ABC Chowk', job: 'Notes 340 pp A4 B/W ×1, spiral', billed: 730, received: 730, fee: 0, status: 'COMPLETED' },
  { time: '9:38', no: 'VE-MUK-202607-0140', branch: 'Mukund Nagar', job: 'A3 glossy poster ×8', billed: 320, received: 320, fee: 0, status: 'PRINTING' },
  { time: '9:21', no: 'VE-JMR-202607-0054', branch: 'JM Road', job: 'CAD sheets A3 ×12', billed: 1560, received: 0, fee: 0, status: 'CANCELLED' },
  { time: '9:04', no: 'VE-ABC-202607-0087', branch: 'ABC Chowk', job: 'Colour brochure A4 ×50', billed: 990, received: 990, fee: 45, status: 'OUT_FOR_DELIVERY' },
  { time: '8:56', no: 'VE-SAT-202607-0031', branch: 'Satara Road', job: 'Lamination 22 pages + xerox 60 pp', billed: 640, received: 640, fee: 0, status: 'COMPLETED' },
  { time: '8:42', no: 'VE-SHN-202607-0019', branch: 'Shanti Nagar', job: 'Wedding cards colour ×120', billed: 280, received: 0, fee: 0, status: 'PAYMENT_PENDING_VERIFICATION' },
  { time: '8:33', no: 'VE-PUN-202607-0022', branch: 'Pune Corporation', job: 'Tender booklet 84 pp ×6, spiral', billed: 1180, received: 1180, fee: 60, status: 'COMPLETED' },
  { time: '8:20', no: 'VE-MUK-202607-0138', branch: 'Mukund Nagar', job: 'Thesis 186 pp ×4 + colour plates', billed: 2650, received: 2650, fee: 0, status: 'OUT_FOR_DELIVERY' },
];

interface BranchStat {
  name: string;
  billed: number;
  received: number;
}
const BRANCH_STATS: BranchStat[] = [
  { name: 'Mukund Nagar', billed: 12480, received: 12480 },
  { name: 'ABC Chowk', billed: 15240, received: 14990 },
  { name: 'JM Road', billed: 9860, received: 8300 },
  { name: 'Satara Road (MM Digital)', billed: 7420, received: 7420 },
  { name: 'Shanti Nagar', billed: 4180, received: 3900 },
];

const TOP_SERVICES: { name: string; amount: number }[] = [
  { name: 'B/W printing (A4)', amount: 21400 },
  { name: 'Colour printing', amount: 14800 },
  { name: 'Binding & finishing', amount: 8600 },
  { name: 'Large-format / CAD', amount: 5900 },
  { name: 'Lamination', amount: 3790 },
];

const MISMATCHES: { title: string; body: string }[] = [
  {
    title: 'JM Road — gap ' + inr(1560),
    body: 'VE-JMR-202607-0054 cancelled after printing; refund needed.',
  },
  {
    title: 'Shanti Nagar — gap ' + inr(280),
    body: 'UPI reference submitted but not found in bank statement.',
  },
];

const RANGE_LABELS: Record<'today' | 'week' | 'month', string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

export default function ReportsPage() {
  const [reportDate, setReportDate] = useState('2026-07-26');
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month'>('today');

  const rangeChips: { key: 'today' | 'week' | 'month'; label: string }[] = [
    { key: 'today', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ];

  // --- metrics computed from the mock orders array -------------------------
  const ordersCount = REPORT_ROWS.length;
  const billedTotal = REPORT_ROWS.reduce((a, r) => a + r.billed, 0);
  const receivedTotal = REPORT_ROWS.reduce((a, r) => a + r.received, 0);
  const gapTotal = billedTotal - receivedTotal;
  const deliveryFees = REPORT_ROWS.reduce((a, r) => a + r.fee, 0);
  const cancelledCount = REPORT_ROWS.filter((r) => r.status === 'CANCELLED').length;
  const toChase = REPORT_ROWS.filter((r) => r.received < r.billed && r.status !== 'CANCELLED').length;

  const metrics: { label: string; value: string; sub: string; color?: string }[] = [
    { label: 'ORDERS', value: String(ordersCount), sub: '5 branches' },
    { label: 'BILLED', value: inr(billedTotal), sub: 'all jobs raised' },
    { label: 'RECEIVED', value: inr(receivedTotal), sub: 'Razorpay + verified UPI', color: '#1F6B3E' },
    { label: 'GAP', value: inr(gapTotal), sub: `${toChase} orders to chase`, color: '#B23B3B' },
    { label: 'DELIVERY FEES', value: inr(deliveryFees), sub: 'courier fees paid' },
    { label: 'CANCELLED', value: String(cancelledCount), sub: inr(1560) + ' reversed' },
  ];

  const maxB = Math.max(...BRANCH_STATS.map((x) => Math.max(x.billed, x.received)));
  const maxSvc = Math.max(...TOP_SERVICES.map((x) => x.amount));

  const rangeLabel = RANGE_LABELS[reportRange];

  const exportCsv = () => {
    const header = ['time', 'order', 'branch', 'job', 'billed', 'received', 'status'];
    const rows = [header].concat(
      REPORT_ROWS.map((r) => [
        r.time,
        r.no,
        r.branch,
        '"' + r.job.replace(/"/g, '""') + '"',
        String(r.billed),
        String(r.received),
        r.status,
      ]),
    );
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'virat-report-' + reportDate + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="reports-page"
      style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 32px 96px' }}
    >
      <style>{`@media(max-width:720px){
        .reports-metric-strip{grid-template-columns:1fr 1fr !important;}
        .reports-metric-cell{border-bottom:1px solid #F0EDE5;}
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
          borderBottom: '1px solid #E7E4DC',
          paddingBottom: '22px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
            REPORTS
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-.025em' }}>
            Billed vs received
          </h1>
          <div style={{ fontSize: '13px', color: '#8A8578', marginTop: '5px' }}>
            Per-branch and all-branch — end-of-day summary emails via cron in production.
          </div>
          <div style={{ fontSize: '12px', color: '#B0AB9F', marginTop: '4px' }}>
            Demo data — figures update live once Supabase is configured.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              padding: '9px 12px',
              border: '1px solid #D8D2C4',
              borderRadius: '6px',
              background: '#fff',
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
            style={{
              background: '#1B3A6B',
              color: '#fff',
              border: 0,
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* metric strip */}
      <div
        className="reports-metric-strip"
        style={{
          marginTop: '28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6,1fr)',
          gap: 0,
          border: '1px solid #E7E4DC',
          background: '#fff',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="reports-metric-cell"
            style={{ padding: '18px 20px', borderLeft: i === 0 ? '0' : '1px solid #F0EDE5' }}
          >
            <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.14em', color: '#8A8578' }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                marginTop: '6px',
                letterSpacing: '-.02em',
                color: m.color,
              }}
            >
              {m.value}
            </div>
            <div style={{ fontSize: '11.5px', color: '#8A8578', marginTop: '2px' }}>{m.sub}</div>
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
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
              PER BRANCH
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#8A8578' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#1B3A6B', display: 'inline-block' }} />
                Billed
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#F5821F', display: 'inline-block' }} />
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
              borderTop: '1px solid #E7E4DC',
              paddingTop: '20px',
            }}
          >
            {BRANCH_STATS.map((b) => {
              const matched = b.received >= b.billed;
              return (
                <div key={b.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700 }}>{b.name}</div>
                    <div
                      className="mono"
                      style={{ fontSize: '12px', fontWeight: 700, color: matched ? '#1F6B3E' : '#B23B3B' }}
                    >
                      {matched ? 'matched' : 'gap ' + inr(b.billed - b.received)}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '12px', background: '#F0EDE5' }}>
                        <div
                          style={{
                            width: Math.round((b.billed / maxB) * 100) + '%',
                            height: '100%',
                            background: '#1B3A6B',
                          }}
                        />
                      </div>
                      <div
                        className="mono"
                        style={{ width: '80px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700 }}
                      >
                        {inr(b.billed)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '12px', background: '#F0EDE5' }}>
                        <div
                          style={{
                            width: Math.round((b.received / maxB) * 100) + '%',
                            height: '100%',
                            background: '#F5821F',
                          }}
                        />
                      </div>
                      <div
                        className="mono"
                        style={{ width: '80px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700 }}
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
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
            TOP SERVICES
          </div>
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderTop: '1px solid #E7E4DC',
              paddingTop: '20px',
            }}
          >
            {TOP_SERVICES.map((s, i) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="mono" style={{ fontWeight: 700 }}>
                    {inr(s.amount)}
                  </div>
                </div>
                <div style={{ marginTop: '6px', height: '8px', background: '#F0EDE5' }}>
                  <div
                    style={{
                      width: Math.round((s.amount / maxSvc) * 100) + '%',
                      height: '100%',
                      background: i === 0 ? '#1B3A6B' : '#9DAFC9',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '28px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
              MISMATCHES TO CHASE
            </div>
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {MISMATCHES.map((m) => (
                <div key={m.title} style={{ borderLeft: '2px solid #B23B3B', paddingLeft: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#B23B3B' }}>{m.title}</div>
                  <div style={{ fontSize: '12.5px', color: '#55524A', marginTop: '3px', lineHeight: 1.5 }}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* orders table */}
      <div style={{ marginTop: '40px', overflowX: 'auto' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.2em', color: '#8A8578' }}>
          ORDERS — {rangeLabel.toUpperCase()}
        </div>
        <div style={{ marginTop: '16px', minWidth: '1020px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 190px 140px minmax(220px,1fr) 90px 90px 180px',
              gap: '14px',
              padding: '0 0 10px',
              borderBottom: '1px solid #1A1A1A',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '.12em',
              color: '#8A8578',
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
          {REPORT_ROWS.map((r) => (
            <div
              key={r.no}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 190px 140px minmax(220px,1fr) 90px 90px 180px',
                gap: '14px',
                padding: '13px 0',
                borderBottom: '1px solid #F0EDE5',
                fontSize: '13px',
                alignItems: 'center',
              }}
            >
              <div className="mono" style={{ color: '#8A8578', fontSize: '12px' }}>
                {r.time}
              </div>
              <div className="mono" style={{ fontSize: '11.5px' }}>
                {r.no}
              </div>
              <div>{r.branch}</div>
              <div style={{ color: '#55524A' }}>{r.job}</div>
              <div className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '12.5px' }}>
                {inr(r.billed)}
              </div>
              <div
                className="mono"
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  color: r.received ? '#1F6B3E' : '#B23B3B',
                }}
              >
                {r.received ? inr(r.received) : '—'}
              </div>
              <div>
                <span style={pill(r.status)}>{statusLabel(r.status)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
