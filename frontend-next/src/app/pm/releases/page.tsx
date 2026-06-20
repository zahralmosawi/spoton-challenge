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

export default function ReleasesPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [readyItems, setReadyItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ version: '', summary: '', release_date: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'error'|'success'>('error');

  useEffect(() => { loadReleases(); loadReadyItems(); }, []);

  async function loadReleases() {
    const data = await apiFetch('/it-workspace/releases');
    setReleases(Array.isArray(data) ? data : []);
  }

  async function loadReadyItems() {
    const data = await apiFetch('/it-workspace/work-items?status=ready_for_release');
    setReadyItems(Array.isArray(data) ? data : []);
  }

  async function createRelease() {
    if (!form.version.trim()) return alert('Version is required');
    setSaving(true);
    const res = await apiFetch('/it-workspace/releases', {
      method: 'POST',
      body: JSON.stringify({ ...form, release_date: form.release_date || null }),
    });
    setSaving(false);
    if (res.id) {
      setShowForm(false);
      setForm({ version: '', summary: '', release_date: '' });
      loadReleases();
    } else {
      showMsg(res.message || 'Failed to create release', 'error');
    }
  }

  async function linkItem(releaseId: string, workItemId: string) {
    const res = await apiFetch(`/it-workspace/releases/${releaseId}/link`, {
      method: 'POST',
      body: JSON.stringify({ work_item_id: workItemId }),
    });
    if (res.message === 'Linked successfully') {
      showMsg('Item linked!', 'success');
      loadReleases();
      loadReadyItems();
    } else {
      showMsg(res.message || 'Failed to link', 'error');
    }
  }

  async function deployRelease(releaseId: string) {
    if (!confirm('Deploy this release? All linked items will be marked as released.')) return;
    const res = await apiFetch(`/it-workspace/releases/${releaseId}/deploy`, { method: 'POST' });
    if (res.message === 'Release deployed successfully') {
      showMsg('Release deployed successfully!', 'success');
      loadReleases();
      loadReadyItems();
      if (selected?.id === releaseId) setSelected({ ...selected, deployment_status: 'deployed' });
    } else {
      showMsg(res.message || 'Failed to deploy', 'error');
    }
  }

  function showMsg(text: string, type: 'error'|'success') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  }

  const linkedIds = selected?.work_items?.map((w: any) => w.id) || [];
  const availableToLink = readyItems.filter(i => !linkedIds.includes(i.id));

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>

      {/* LEFT — releases list */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #f1f5f9' }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Releases</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>All Releases</div>
            </div>
            <button onClick={() => setShowForm(true)} style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.35)'
            }}>+ New Release</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Total', value: releases.length, color: '#64748b' },
              { label: 'Deployed', value: releases.filter(r => r.deployment_status === 'deployed').length, color: '#16a34a' },
              { label: 'Draft', value: releases.filter(r => r.deployment_status === 'draft').length, color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: '#f1f5f9' }} />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {releases.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No releases yet</div>
              <div style={{ fontSize: 13 }}>Create your first release</div>
            </div>
          )}
          {releases.map(release => {
            const isSelected = selected?.id === release.id;
            const isDeployed = release.deployment_status === 'deployed';
            return (
              <div key={release.id} onClick={() => setSelected(release)}
                style={{
                  padding: '14px 16px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                  background: isSelected ? '#f5f3ff' : '#fff',
                  borderLeft: `3px solid ${isSelected ? '#7c3aed' : 'transparent'}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>v{release.version}</span>
                  <span style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                    background: isDeployed ? '#f0fdf4' : '#fffbeb',
                    color: isDeployed ? '#16a34a' : '#d97706',
                    border: `1px solid ${isDeployed ? '#bbf7d0' : '#fde68a'}`
                  }}>{isDeployed ? 'Deployed' : 'Draft'}</span>
                </div>
                {release.summary && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{release.summary}</div>}
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{release.work_items?.length || 0} items linked</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — release detail */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        {msg && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 999,
            background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: msgType === 'success' ? '#16a34a' : '#dc2626',
            borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>{msg}</div>
        )}

        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No release selected</div>
            <div style={{ fontSize: 13 }}>Select a release from the left to manage it</div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 64px' }}>

            {/* Release header */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Release</div>
                  <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0 }}>v{selected.version}</h2>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 20, fontWeight: 700,
                    background: selected.deployment_status === 'deployed' ? '#f0fdf4' : '#fffbeb',
                    color: selected.deployment_status === 'deployed' ? '#16a34a' : '#d97706',
                    border: `1px solid ${selected.deployment_status === 'deployed' ? '#bbf7d0' : '#fde68a'}`
                  }}>{selected.deployment_status === 'deployed' ? 'Deployed' : 'Draft'}</span>
                  {selected.deployment_status !== 'deployed' && (
                    <button onClick={() => deployRelease(selected.id)} style={{
                      background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
                      border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.35)'
                    }}>Deploy Release</button>
                  )}
                </div>
              </div>
              {selected.summary && <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: 0, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>{selected.summary}</p>}
            </div>

            {/* Linked work items */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Linked Work Items ({selected.work_items?.length || 0})
              </div>
              {(!selected.work_items || selected.work_items.length === 0) && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>No items linked yet</div>
              )}
              {selected.work_items?.map((item: any) => (
                <div key={item.id} style={{ padding: '12px', borderRadius: 10, border: '1px solid #f1f5f9', marginBottom: 8, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.type} · {item.priority}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                    {item.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>

            {/* Available to link */}
            {selected.deployment_status !== 'deployed' && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Ready to Link ({availableToLink.length})
                </div>
                {availableToLink.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                    No items ready for release. Move items through QA first.
                  </div>
                )}
                {availableToLink.map(item => (
                  <div key={item.id} style={{ padding: '12px', borderRadius: 10, border: '1px solid #f1f5f9', marginBottom: 8, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.type} · {item.priority}</div>
                    </div>
                    <button onClick={() => linkItem(selected.id, item.id)} style={{
                      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}>+ Link</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 480, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>New Release</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Create a new release version</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✕</button>
            </div>
            {[
              { label: 'Version *', key: 'version', placeholder: 'e.g. 1.0.0', type: 'text' },
              { label: 'Summary', key: 'summary', placeholder: 'What is in this release?', type: 'text' },
              { label: 'Release Date', key: 'release_date', placeholder: '', type: 'date' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={createRelease} disabled={saving}
                style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}