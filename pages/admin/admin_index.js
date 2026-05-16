import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Simple admin panel — accessible at /admin
// In production you'd add a password check here

const TABLES = ['categories', 'stars', 'studios', 'platforms']

export default function Admin() {
  const [tab, setTab] = useState('categories')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newRow, setNewRow] = useState({})
  const [linkTab, setLinkTab] = useState(false)
  const [linkForm, setLinkForm] = useState({ url: '', title: '', entity_type: 'category', entity_id: '', platform_id: '' })
  const [fetching, setFetching] = useState(false)
  const [allEntities, setAllEntities] = useState({})
  const [platforms, setPlatforms] = useState([])

  useEffect(() => { loadRows() }, [tab])

  useEffect(() => {
    loadAllEntities()
  }, [])

  const loadRows = async () => {
    setLoading(true)
    const { data } = await supabase.from(tab).select('*').order('sort_order')
    setRows(data || [])
    setLoading(false)
  }

  const loadAllEntities = async () => {
    const results = {}
    for (const t of TABLES) {
      const { data } = await supabase.from(t).select('id, name').eq('is_active', true)
      results[t] = data || []
    }
    setAllEntities(results)
    setPlatforms(results.platforms || [])
  }

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const addRow = async () => {
    if (!newRow.name) return
    const slug = slugify(newRow.name)
    const { error } = await supabase.from(tab).insert({ ...newRow, slug, is_active: true })
    if (!error) { setNewRow({}); setShowAdd(false); loadRows(); loadAllEntities() }
    else alert(error.message)
  }

  const toggleActive = async (id, current) => {
    await supabase.from(tab).update({ is_active: !current }).eq('id', id)
    loadRows()
  }

  const deleteRow = async (id) => {
    if (!confirm('Delete this item?')) return
    await supabase.from(tab).delete().eq('id', id)
    loadRows()
  }

  const fetchOG = async () => {
    if (!linkForm.url) return
    setFetching(true)
    try {
      const res = await fetch(`/api/fetch-og?url=${encodeURIComponent(linkForm.url)}`)
      const data = await res.json()
      setLinkForm(prev => ({ ...prev, title: data.title || '', thumbnail_url: data.image || '' }))
    } catch (e) {}
    setFetching(false)
  }

  const addLink = async () => {
    if (!linkForm.url || !linkForm.entity_id) return alert('URL and entity are required')
    const { error } = await supabase.from('content_links').insert({
      url: linkForm.url,
      title: linkForm.title,
      thumbnail_url: linkForm.thumbnail_url,
      entity_type: linkForm.entity_type,
      entity_id: linkForm.entity_id,
      platform_id: linkForm.platform_id || null,
      is_active: true,
    })
    if (!error) {
      alert('Link added!')
      setLinkForm({ url: '', title: '', entity_type: 'category', entity_id: '', platform_id: '' })
    } else alert(error.message)
  }

  const entityTypeTable = { category: 'categories', star: 'stars', studio: 'studios', platform: 'platforms' }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Nu<span style={{ color: 'var(--accent)' }}>Dex</span> <span style={{ fontSize: 14, color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>Admin</span></div>
      </div>

      {/* Main tabs */}
      <div style={styles.tabs}>
        {[...TABLES, 'content_links'].map(t => (
          <button key={t} onClick={() => { setTab(t); setLinkTab(t === 'content_links') }}
            style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content Links tab */}
      {linkTab ? (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Add content link</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>
            Paste a URL — the system will auto-fetch the thumbnail and title.
          </p>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>URL *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={linkForm.url} onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://www.pornhub.com/view_video.php?..." style={{ ...styles.input, flex: 1 }} />
                <button onClick={fetchOG} disabled={fetching} style={styles.fetchBtn}>
                  {fetching ? '...' : 'Fetch'}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Title (auto-filled)</label>
              <input value={linkForm.title || ''} onChange={e => setLinkForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Scene title" style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Thumbnail URL (auto-filled)</label>
              <input value={linkForm.thumbnail_url || ''} onChange={e => setLinkForm(p => ({ ...p, thumbnail_url: e.target.value }))}
                placeholder="https://..." style={styles.input} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Entity type *</label>
              <select value={linkForm.entity_type} onChange={e => setLinkForm(p => ({ ...p, entity_type: e.target.value, entity_id: '' }))}
                style={styles.input}>
                <option value="category">Category</option>
                <option value="star">Star</option>
                <option value="studio">Studio</option>
                <option value="platform">Platform</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Entity (who does this belong to?) *</label>
              <select value={linkForm.entity_id} onChange={e => setLinkForm(p => ({ ...p, entity_id: e.target.value }))}
                style={styles.input}>
                <option value="">— Select —</option>
                {(allEntities[entityTypeTable[linkForm.entity_type]] || []).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Platform (optional)</label>
              <select value={linkForm.platform_id} onChange={e => setLinkForm(p => ({ ...p, platform_id: e.target.value }))}
                style={styles.input}>
                <option value="">— Select platform —</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {linkForm.thumbnail_url && (
            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>Thumbnail preview</label>
              <img src={linkForm.thumbnail_url} style={{ height: 80, borderRadius: 6, marginTop: 6, border: '1px solid var(--border)' }} alt="preview" />
            </div>
          )}

          <button onClick={addLink} style={styles.addBtn}>Add link</button>

          {/* Existing links */}
          <ContentLinksList />
        </div>
      ) : (
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={styles.sectionTitle}>Manage {tab}</h2>
            <button onClick={() => setShowAdd(!showAdd)} style={styles.addBtn}>+ Add new</button>
          </div>

          {showAdd && (
            <div style={styles.addForm}>
              <input value={newRow.name || ''} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))}
                placeholder={`${tab.slice(0, -1)} name`} style={styles.input} />
              <input value={newRow.description || ''} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)" style={styles.input} />
              <input value={newRow.cover_image_url || ''} onChange={e => setNewRow(p => ({ ...p, cover_image_url: e.target.value }))}
                placeholder="Image URL (e.g. https://i.imgur.com/abc.jpg)" style={styles.input} />
              {newRow.cover_image_url && (
                <img src={newRow.cover_image_url} style={{ height: 60, borderRadius: 6, border: '1px solid var(--border)' }} alt="preview" />
              )}
              {tab === 'platforms' && (
                <>
                  <input value={newRow.base_url || ''} onChange={e => setNewRow(p => ({ ...p, base_url: e.target.value }))}
                    placeholder="Base URL (e.g. https://onlyfans.com)" style={styles.input} />
                  <select value={newRow.type || 'free'} onChange={e => setNewRow(p => ({ ...p, type: e.target.value }))} style={styles.input}>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="subscription">Subscription</option>
                    <option value="ppv">PPV</option>
                  </select>
                </>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addRow} style={styles.addBtn}>Save</button>
                <button onClick={() => setShowAdd(false)} style={styles.cancelBtn}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? <p style={{ color: 'var(--text3)' }}>Loading...</p> : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Slug</th>
                  <th style={styles.th}>Active</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={styles.td}>{row.name}</td>
                    <td style={{ ...styles.td, color: 'var(--text3)', fontSize: 12 }}>{row.slug}</td>
                    <td style={styles.td}>
                      <button onClick={() => toggleActive(row.id, row.is_active)}
                        style={{ ...styles.badge, background: row.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)', color: row.is_active ? '#22c55e' : 'var(--text3)', border: `1px solid ${row.is_active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}` }}>
                        {row.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => deleteRow(row.id)} style={styles.deleteBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} style={{ ...styles.td, color: 'var(--text3)', textAlign: 'center', padding: '32px' }}>No {tab} yet. Add your first one above.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ContentLinksList() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('content_links').select('*, platforms(name)').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setLinks(data || []); setLoading(false) })
  }, [])

  const deleteLink = async (id) => {
    if (!confirm('Delete this link?')) return
    await supabase.from('content_links').delete().eq('id', id)
    setLinks(links.filter(l => l.id !== id))
  }

  if (loading) return null

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 16 }}>Existing links ({links.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(link => (
          <div key={link.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {link.thumbnail_url && <img src={link.thumbnail_url} style={{ width: 60, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} alt="" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.title || link.url}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{link.entity_type} · {link.platforms?.name || 'no platform'}</div>
            </div>
            <button onClick={() => deleteLink(link.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        {links.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No links yet.</p>}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '0 0 60px' },
  header: { padding: '20px 28px', borderBottom: '1px solid var(--border)' },
  logo: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 },
  tabs: { display: 'flex', gap: 2, padding: '12px 28px', borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  tabBtn: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: 'var(--accent-bg)', color: 'var(--accent)' },
  section: { padding: '28px' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'var(--text3)', fontWeight: 500 },
  input: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%' },
  fetchBtn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  addBtn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, marginTop: 16, cursor: 'pointer' },
  cancelBtn: { background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', fontSize: 14, marginTop: 16 },
  addForm: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text3)', borderBottom: '1px solid var(--border)', fontWeight: 500 },
  td: { padding: '12px', fontSize: 14, verticalAlign: 'middle' },
  badge: { borderRadius: 20, padding: '3px 10px', fontSize: 11, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
}
