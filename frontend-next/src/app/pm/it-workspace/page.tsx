'use client';
import { useEffect, useState } from 'react';

function apiFetch(path: string, options: any = {}) {
  const token = localStorage.getItem('spoton_challenge_token') || '';
  return fetch(`http://localhost:3001${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(r => r.json());
}

const STATUS_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
  backlog:           { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: 'Backlog' },
  planned:           { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Planned' },
  in_progress:       { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'In Progress' },
  qa:                { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', label: 'QA' },
  ready_for_release: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Ready' },
  released:          { bg: '#14532d', text: '#ffffff', border: '#14532d', label: 'Released' },
};

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  low:    { color: '#94a3b8', label: 'Low' },
  medium: { color: '#3b82f6', label: 'Medium' },
  high:   { color: '#f59e0b', label: 'High' },
  urgent: { color: '#ef4444', label: 'Urgent' },
};

const NEXT_STATUS: Record<string, string> = {
  backlog: 'planned', planned: 'in_progress', in_progress: 'qa',
  qa: 'ready_for_release', ready_for_release: 'released',
};

const NEXT_LABEL: Record<string, string> = {
  backlog: 'Mark as Planned', planned: 'Start Progress',
  in_progress: 'Send to QA', qa: 'Mark Ready for Release',
  ready_for_release: 'Mark as Released',
};

const STATUS_ORDER = ['backlog','planned','in_progress','qa','ready_for_release','released'];

export default function ITWorkspacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [form, setForm] = useState({ title: '', description: '', type: 'feature', priority: 'medium', assignee: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => { loadItems(); }, [filters]);

  async function loadItems() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.search) params.set('search', filters.search);
    const data = await apiFetch(`/it-workspace/work-items?${params}`);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createItem() {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    await apiFetch('/it-workspace/work-items', { method: 'POST', body: JSON.stringify({ ...form, due_date: form.due_date || null }) });
    setShowForm(false);
    setForm({ title: '', description: '', type: 'feature', priority: 'medium', assignee: '', due_date: '' });
    setSaving(false);
    loadItems();
  }

  async function moveStatus(id: string, newStatus: string) {
    const res = await apiFetch(`/it-workspace/work-items/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    if (res.statusCode >= 400 || res.error) {
      setStatusMsg(res.message || 'Cannot update status');
      setTimeout(() => setStatusMsg(''), 5000);
    } else {
      setSelected(res);
      loadItems();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this work item?')) return;
    await apiFetch(`/it-workspace/work-items/${id}`, { method: 'DELETE' });
    setSelected(null);
    loadItems();
  }

  const stats = {
    total: items.length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    inQA: items.filter(i => i.status === 'qa').length,
    ready: items.filter(i => i.status === 'ready_for_release').length,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* LEFT PANEL */}
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: '#ffffff', borderRight: '1px solid #f1f5f9' }}>
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>IT Workspace</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Work Items</div>
            </div>
            <button onClick={() => setShowForm(true)} style={{
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
            }}>+ New Item</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Total', value: stats.total, color: '#64748b' },
              { label: 'Active', value: stats.inProgress, color: '#d97706' },
              { label: 'In QA', value: stats.inQA, color: '#7c3aed' },
              { label: 'Ready', value: stats.ready, color: '#16a34a' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
            <input placeholder="Search work items..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', color: '#374151', outline: 'none' }}>
              <option value="">All statuses</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
            </select>
            <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', color: '#374151', outline: 'none' }}>
              <option value="">All priorities</option>
              {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 4px' }} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 13 }}>Loading...</div></div>}
          {!loading && items.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No work items yet</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Create your first item</div>
            </div>
          )}
          {items.map(item => {
            const sm = STATUS_META[item.status] || STATUS_META.backlog;
            const pm = PRIORITY_META[item.priority] || PRIORITY_META.medium;
            const isSelected = selected?.id === item.id;
            const isHovered = hoveredItem === item.id;
            return (
              <div key={item.id}
                onClick={() => setSelected(item)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : isHovered ? '#f8fafc' : '#fff',
                  borderLeft: `3px solid ${isSelected ? '#2563eb' : 'transparent'}`,
                  borderBottom: '1px solid #f8fafc',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, flex: 1 }}>{item.title}</span>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: sm.bg, color: sm.text, border: `1px solid ${sm.border}`, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {sm.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pm.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>{pm.label}</span>
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>·</span>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{item.type}</span>
                  {item.assignee && <>
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>·</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{item.assignee}</span>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No item selected</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Select a work item from the left to view details</div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 64px' }}>
            {statusMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626' }}>
                ⚠️ {statusMsg}
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, flex: 1, paddingRight: 16 }}>{selected.title}</h2>
                <button onClick={() => deleteItem(selected.id)}
                  style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: selected.description ? 16 : 0 }}>
                {(() => { const sm = STATUS_META[selected.status] || STATUS_META.backlog; return (
                  <span style={{ padding: '5px 12px', borderRadius: 20, background: sm.bg, color: sm.text, border: `1px solid ${sm.border}`, fontSize: 12, fontWeight: 700 }}>{sm.label}</span>
                ); })()}
                <span style={{ padding: '5px 12px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{selected.type}</span>
                <span style={{ padding: '5px 12px', borderRadius: 20, background: '#f1f5f9', color: PRIORITY_META[selected.priority]?.color, fontSize: 12, fontWeight: 600 }}>
                  {PRIORITY_META[selected.priority]?.label}
                </span>
              </div>

              {selected.description && (
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '16px 0 0', padding: '16px 0 0', borderTop: '1px solid #f1f5f9' }}>{selected.description}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Assignee', value: selected.assignee || '—' },
                { label: 'Due date', value: selected.due_date ? new Date(selected.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'Created by', value: selected.created_by || '—' },
                { label: 'Created', value: new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Workflow</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STATUS_ORDER.map((s, i) => {
                  const sm = STATUS_META[s];
                  const currentIdx = STATUS_ORDER.indexOf(selected.status);
                  const isDone = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_ORDER.length - 1 ? 1 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: isCurrent ? 28 : 20, height: isCurrent ? 28 : 20, borderRadius: '50%',
                          background: isDone ? (isCurrent ? '#2563eb' : '#dbeafe') : '#f1f5f9',
                          border: `2px solid ${isDone ? (isCurrent ? '#2563eb' : '#93c5fd') : '#e2e8f0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {isDone && !isCurrent && <span style={{ color: '#2563eb', fontSize: 10 }}>✓</span>}
                          {isCurrent && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                        </div>
                        <span style={{ fontSize: 9, color: isCurrent ? '#2563eb' : isDone ? '#64748b' : '#cbd5e1', fontWeight: isCurrent ? 700 : 500, whiteSpace: 'nowrap' }}>
                          {sm.label}
                        </span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < STATUS_ORDER.indexOf(selected.status) ? '#93c5fd' : '#e2e8f0', margin: '0 4px', marginBottom: 18 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {NEXT_STATUS[selected.status] && (
              <button onClick={() => moveStatus(selected.id, NEXT_STATUS[selected.status])}
                style={{
                  width: '100%', padding: '13px', marginBottom: 16,
                  background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                }}>
                {NEXT_LABEL[selected.status]} →
              </button>
            )}

            <QASection workItemId={selected.id} status={selected.status} />
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 520, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>New Work Item</h3>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✕</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title *</label>
              <input placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
              <textarea placeholder="Add more context..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, height: 90, resize: 'vertical', boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none' }}>
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="improvement">Improvement</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assignee</label>
                <input placeholder="Team member name" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={createItem} disabled={saving}
                style={{ flex: 2, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : '+ Create Work Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QASection({ workItemId, status }: { workItemId: string; status: string }) {
  const [checks, setChecks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ test_title: '', expected_result: '', tester: '' });

  useEffect(() => { loadChecks(); }, [workItemId]);

  async function loadChecks() {
    const data = await apiFetch(`/it-workspace/work-items/${workItemId}/qa-checks`);
    setChecks(Array.isArray(data) ? data : []);
  }

  async function addCheck() {
    if (!form.test_title.trim()) return alert('Test title is required');
    await apiFetch(`/it-workspace/work-items/${workItemId}/qa-checks`, { method: 'POST', body: JSON.stringify(form) });
    setForm({ test_title: '', expected_result: '', tester: '' });
    setShowAdd(false);
    loadChecks();
  }

  async function updateCheck(checkId: string, newStatus: string) {
    await apiFetch(`/it-workspace/work-items/${workItemId}/qa-checks/${checkId}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    loadChecks();
  }

  const passed = checks.filter(c => c.status === 'passed').length;
  const failed = checks.filter(c => c.status === 'failed').length;
  const total = checks.length;
  const pct = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Quality Assurance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>QA Checks</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>{passed} passed</span>
              {failed > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>{failed} failed</span>}
            </div>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10,
          background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#374151'
        }}>
          {showAdd ? '✕ Cancel' : '+ Add Check'}
        </button>
      </div>

      {total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{pct}% complete</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{passed}/{total}</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct === 100 ? '#16a34a' : '#2563eb', width: `${pct}%`, borderRadius: 20, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map(check => (
          <div key={check.id} style={{
            padding: '14px', borderRadius: 12, border: '1px solid #f1f5f9',
            background: check.status === 'passed' ? '#f0fdf4' : check.status === 'failed' ? '#fef2f2' : '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{check.test_title}</div>
                {check.expected_result && <div style={{ fontSize: 12, color: '#64748b' }}>Expected: {check.expected_result}</div>}
                {check.tester && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tester: {check.tester}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {[
                  { s: 'pending', label: '⏳', active: '#e2e8f0', color: '#64748b' },
                  { s: 'passed', label: '✓', active: '#bbf7d0', color: '#16a34a' },
                  { s: 'failed', label: '✕', active: '#fecaca', color: '#dc2626' },
                ].map(btn => (
                  <button key={btn.s} onClick={() => updateCheck(check.id, btn.s)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      background: check.status === btn.s ? btn.active : '#f1f5f9',
                      color: check.status === btn.s ? btn.color : '#94a3b8' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {total === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>No QA checks yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Add checks to gate this item before release</div>
        </div>
      )}

      {showAdd && (
        <div style={{ marginTop: 12, padding: 16, border: '1.5px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
          <input placeholder="Test title *" value={form.test_title} onChange={e => setForm(f => ({ ...f, test_title: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none', background: '#fff' }} />
          <input placeholder="Expected result" value={form.expected_result} onChange={e => setForm(f => ({ ...f, expected_result: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none', background: '#fff' }} />
          <input placeholder="Tester name" value={form.tester} onChange={e => setForm(f => ({ ...f, tester: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', outline: 'none', background: '#fff' }} />
          <button onClick={addCheck}
            style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Add QA Check
          </button>
        </div>
      )}
    </div>
  );
}