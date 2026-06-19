'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('spoton_challenge_token') || '';
}

function apiFetch(path: string, options: any = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  }).then(r => r.json());
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  planned: '#3b82f6',
  in_progress: '#f59e0b',
  qa: '#8b5cf6',
  ready_for_release: '#10b981',
  released: '#059669',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export default function ITWorkspacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [form, setForm] = useState({ title: '', description: '', type: 'feature', priority: 'medium', assignee: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { loadItems(); }, [filters]);

  async function loadItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search) params.set('search', filters.search);
      const data = await apiFetch(`/it-workspace/work-items?${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load work items');
    } finally {
      setLoading(false);
    }
  }

  async function createItem() {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      await apiFetch('/it-workspace/work-items', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ title: '', description: '', type: 'feature', priority: 'medium', assignee: '', due_date: '' });
      loadItems();
    } catch (e) {
      alert('Failed to create item');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      await apiFetch(`/it-workspace/work-items/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      loadItems();
      if (selected?.id === id) setSelected({ ...selected, status: newStatus });
    } catch (e: any) {
      alert(e.message || 'Cannot update status');
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this work item?')) return;
    await apiFetch(`/it-workspace/work-items/${id}`, { method: 'DELETE' });
    setSelected(null);
    loadItems();
  }

  const NEXT_STATUS: Record<string, string> = {
    backlog: 'planned',
    planned: 'in_progress',
    in_progress: 'qa',
    qa: 'ready_for_release',
    ready_for_release: 'released',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* LEFT PANEL */}
      <div style={{ width: 420, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>IT Workspace</h1>
            <button onClick={() => setShowForm(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>+ New Item</button>
          </div>
          {/* Filters */}
          <input placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              style={{ flex: 1, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
              <option value="">All statuses</option>
              <option value="backlog">Backlog</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="qa">QA</option>
              <option value="ready_for_release">Ready</option>
              <option value="released">Released</option>
            </select>
            <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
              style={{ flex: 1, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>Loading...</div>}
          {error && <div style={{ padding: 20, color: '#ef4444' }}>{error}</div>}
          {!loading && items.length === 0 && <div style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>No work items yet. Create one!</div>}
          {items.map(item => (
            <div key={item.id} onClick={() => setSelected(item)}
              style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selected?.id === item.id ? '#eff6ff' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 8 }}>{item.title}</div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: STATUS_COLORS[item.status] + '20', color: STATUS_COLORS[item.status], fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {item.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{item.type}</span>
                <span style={{ fontSize: 11, color: PRIORITY_COLORS[item.priority], fontWeight: 500 }}>{item.priority}</span>
                {item.assignee && <span style={{ fontSize: 11, color: '#6b7280' }}>→ {item.assignee}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!selected && (
          <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div>Select a work item to view details</div>
          </div>
        )}
        {selected && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>{selected.title}</h2>
              <button onClick={() => deleteItem(selected.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: STATUS_COLORS[selected.status] + '20', color: STATUS_COLORS[selected.status], fontSize: 12, fontWeight: 600 }}>
                {selected.status?.replace(/_/g, ' ')}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: '#f3f4f6', color: '#374151', fontSize: 12 }}>{selected.type}</span>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: PRIORITY_COLORS[selected.priority] + '20', color: PRIORITY_COLORS[selected.priority], fontSize: 12, fontWeight: 600 }}>{selected.priority}</span>
            </div>

            {selected.description && <p style={{ color: '#374151', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: 13 }}>
              {selected.assignee && <div><span style={{ color: '#6b7280' }}>Assignee: </span>{selected.assignee}</div>}
              {selected.due_date && <div><span style={{ color: '#6b7280' }}>Due: </span>{new Date(selected.due_date).toLocaleDateString()}</div>}
              <div><span style={{ color: '#6b7280' }}>Created by: </span>{selected.created_by}</div>
            </div>

            {/* Move status */}
            {NEXT_STATUS[selected.status] && (
              <button onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>
                Move to: {NEXT_STATUS[selected.status]?.replace(/_/g, ' ')} →
              </button>
            )}

            {/* QA Section */}
            <QASection workItemId={selected.id} status={selected.status} />
          </div>
        )}
      </div>

      {/* CREATE FORM MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Work Item</h3>
            <input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 10 }} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 10, height: 80, resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="improvement">Improvement</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <input placeholder="Assignee" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 10 }} />
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={createItem} disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QASection({ workItemId, status }: { workItemId: string, status: string }) {
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

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>QA Checks ({passed}/{checks.length} passed)</h3>
        <button onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>+ Add Check</button>
      </div>

      {checks.length > 0 && (
        <div style={{ marginBottom: 8, background: '#f3f4f6', borderRadius: 6, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#10b981', width: `${checks.length ? (passed / checks.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
        </div>
      )}

      {checks.map(check => (
        <div key={check.id} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{check.test_title}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['pending', 'passed', 'failed'].map(s => (
                <button key={s} onClick={() => updateCheck(check.id, s)}
                  style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: check.status === s ? (s === 'passed' ? '#d1fae5' : s === 'failed' ? '#fee2e2' : '#e5e7eb') : '#f9fafb',
                    color: check.status === s ? (s === 'passed' ? '#065f46' : s === 'failed' ? '#991b1b' : '#374151') : '#6b7280',
                    fontWeight: check.status === s ? 600 : 400 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {check.expected_result && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Expected: {check.expected_result}</div>}
          {check.tester && <div style={{ fontSize: 12, color: '#6b7280' }}>Tester: {check.tester}</div>}
        </div>
      ))}

      {showAdd && (
        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
          <input placeholder="Test title *" value={form.test_title} onChange={e => setForm(f => ({ ...f, test_title: e.target.value }))}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8 }} />
          <input placeholder="Expected result" value={form.expected_result} onChange={e => setForm(f => ({ ...f, expected_result: e.target.value }))}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8 }} />
          <input placeholder="Tester name" value={form.tester} onChange={e => setForm(f => ({ ...f, tester: e.target.value }))}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            <button onClick={addCheck} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}