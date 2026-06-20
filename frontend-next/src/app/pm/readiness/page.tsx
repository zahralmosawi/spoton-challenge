'use client';
import { useEffect, useState } from 'react';

function apiFetch(path: string) {
  const token = localStorage.getItem('spoton_challenge_token') || '';
  return fetch(`http://localhost:3001${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }).then(r => r.json());
}

type BlockReason = { type: 'error' | 'warning' | 'ok'; message: string };

function getBlockers(item: any, qaChecks: any[]): BlockReason[] {
  const blockers: BlockReason[] = [];
  if (item.status === 'released') return [{ type: 'ok', message: 'Already released' }];
  if (item.status === 'backlog') blockers.push({ type: 'error', message: 'Still in backlog' });
  if (item.status === 'planned') blockers.push({ type: 'error', message: 'Planned but not started' });
  if (item.status === 'in_progress') blockers.push({ type: 'error', message: 'Still in development' });
  if (qaChecks.length === 0) {
    blockers.push({ type: 'error', message: 'No QA checks added' });
  } else {
    const failed = qaChecks.filter(c => c.status === 'failed');
    const pending = qaChecks.filter(c => c.status === 'pending');
    if (failed.length > 0) blockers.push({ type: 'error', message: `${failed.length} QA check(s) failed` });
    if (pending.length > 0) blockers.push({ type: 'warning', message: `${pending.length} QA check(s) pending` });
  }
  if (!item.assignee) blockers.push({ type: 'warning', message: 'No assignee set' });
  if (!item.due_date) blockers.push({ type: 'warning', message: 'No due date set' });
  if (item.due_date && new Date(item.due_date) < new Date()) blockers.push({ type: 'error', message: 'Past due date' });
  if (blockers.length === 0) {
    if (item.status === 'ready_for_release') return [{ type: 'ok', message: 'Ready for release!' }];
    if (item.status === 'qa') return [{ type: 'warning', message: 'In QA — almost ready' }];
  }
  return blockers;
}

function getRiskScore(item: any, qaChecks: any[]): number {
  let score = 0;
  if (item.priority === 'urgent') score += 4;
  else if (item.priority === 'high') score += 3;
  else if (item.priority === 'medium') score += 2;
  else score += 1;
  score += qaChecks.filter(c => c.status === 'failed').length * 3;
  if (!item.assignee) score += 2;
  if (item.due_date && new Date(item.due_date) < new Date()) score += 3;
  if (qaChecks.length === 0) score += 2;
  return score;
}

export default function ReadinessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [qaMap, setQaMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blocked' | 'ready'>('all');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await apiFetch('/it-workspace/work-items');
    const allItems = Array.isArray(data) ? data : [];
    setItems(allItems);
    const map: Record<string, any[]> = {};
    await Promise.all(allItems.map(async (item: any) => {
      const checks = await apiFetch(`/it-workspace/work-items/${item.id}/qa-checks`);
      map[item.id] = Array.isArray(checks) ? checks : [];
    }));
    setQaMap(map);
    setLoading(false);
  }

  const filtered = items
    .filter(item => item.status !== 'released')
    .filter(item => {
      const blockers = getBlockers(item, qaMap[item.id] || []);
      if (filter === 'blocked') return blockers.some(b => b.type === 'error');
      if (filter === 'ready') return blockers.every(b => b.type === 'ok');
      return true;
    })
    .sort((a, b) => getRiskScore(b, qaMap[b.id] || []) - getRiskScore(a, qaMap[a.id] || []));

  const totalItems = items.filter(i => i.status !== 'released').length;
  const readyItems = items.filter(i => i.status === 'ready_for_release').length;
  const blockedItems = items.filter(i => getBlockers(i, qaMap[i.id] || []).some(b => b.type === 'error')).length;

  return (
    <div style={{ padding: '28px 32px', background: '#f6f7fb', minHeight: '100vh', fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ff5100', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Creative Feature</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>Release Readiness Board</h1>
        <p style={{ fontSize: 14, color: '#667085', margin: 0 }}>See exactly what is blocking each work item from being released.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Active', value: totalItems, color: '#272c4d' },
          { label: 'Ready for Release', value: readyItems, color: '#059669' },
          { label: 'Blocked', value: blockedItems, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#ffffff', border: '1px solid #e6e8ef', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(39,44,77,0.06)' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#667085', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'All Items' },
          { key: 'blocked', label: 'Blocked' },
          { key: 'ready', label: 'Ready' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', border: 'none',
              background: filter === f.key ? '#272c4d' : '#ffffff',
              color: filter === f.key ? '#ffffff' : '#374151',
              boxShadow: '0 1px 3px rgba(39,44,77,0.1)',
            }}>
            {f.label}
          </button>
        ))}
        <button onClick={loadData}
          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#2563eb', color: '#fff', marginLeft: 'auto', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#667085' }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Loading readiness data...</div>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No items to show</div>
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(item => {
          const checks = qaMap[item.id] || [];
          const blockers = getBlockers(item, checks);
          const riskScore = getRiskScore(item, checks);
          const hasErrors = blockers.some(b => b.type === 'error');
          const isReady = blockers.every(b => b.type === 'ok');
          const passed = checks.filter(c => c.status === 'passed').length;

          const statusColor = isReady ? '#059669' : hasErrors ? '#dc2626' : '#2563eb';
          const statusBg = isReady ? '#d1fae5' : hasErrors ? '#fee2e2' : '#dbeafe';
          const statusLabel = isReady ? 'READY' : hasErrors ? 'BLOCKED' : 'AT RISK';
          const borderColor = isReady ? '#059669' : hasErrors ? '#dc2626' : '#2563eb';

          return (
            <div key={item.id} style={{
              background: '#ffffff',
              border: '1px solid #e6e8ef',
              borderRadius: 14,
              padding: '20px 24px',
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: '0 2px 8px rgba(39,44,77,0.08)',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{item.title}</span>
                  <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700, background: statusBg, color: statusColor, border: `1px solid ${borderColor}40` }}>
                    {statusLabel}
                  </span>
                </div>
                <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600, background: '#f6f7fb', color: '#667085', border: '1px solid #e6e8ef', flexShrink: 0 }}>
                  Risk: {riskScore}
                </span>
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#667085', marginBottom: 14, flexWrap: 'wrap' }}>
                <span>Status: <strong style={{ color: '#272c4d' }}>{item.status?.replace(/_/g, ' ')}</strong></span>
                <span>Priority: <strong style={{ color: '#272c4d' }}>{item.priority}</strong></span>
                {item.assignee && <span>Assignee: <strong style={{ color: '#272c4d' }}>{item.assignee}</strong></span>}
                <span>QA: <strong style={{ color: passed === checks.length && checks.length > 0 ? '#059669' : '#272c4d' }}>{passed}/{checks.length} passed</strong></span>
              </div>

              {/* QA Progress */}
              {checks.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#667085', fontWeight: 500 }}>QA Progress</span>
                    <span style={{ fontSize: 11, color: '#667085', fontWeight: 500 }}>{Math.round((passed / checks.length) * 100)}%</span>
                  </div>
                  <div style={{ background: '#e6e8ef', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: passed === checks.length ? '#059669' : '#2563eb',
                      width: `${(passed / checks.length) * 100}%`,
                      borderRadius: 20,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: '#f6f7fb', marginBottom: 12 }} />

              {/* Blockers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {blockers.map((b, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: b.type === 'error' ? '#fef2f2' : b.type === 'warning' ? '#fffbeb' : '#f0fdf4',
                    color: b.type === 'error' ? '#dc2626' : b.type === 'warning' ? '#d97706' : '#059669',
                    border: `1px solid ${b.type === 'error' ? '#fecaca' : b.type === 'warning' ? '#fde68a' : '#bbf7d0'}`,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800 }}>{b.type === 'error' ? '✕' : b.type === 'warning' ? '!' : '✓'}</span>
                    {b.message}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}