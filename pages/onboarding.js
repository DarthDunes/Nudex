import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const STEPS = ['categories', 'stars', 'studios', 'platforms']
const STEP_LABELS = {
  categories: { title: 'What are you into?', sub: 'Pick your favorite categories' },
  stars: { title: 'Who do you follow?', sub: 'Select your favorite performers' },
  studios: { title: 'Any favorite studios?', sub: "We'll surface their latest releases" },
  platforms: { title: 'Which platforms do you use?', sub: "We'll connect you directly" },
}

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ categories: [], stars: [], studios: [], platforms: [] })
  const [selections, setSelections] = useState({ categories: [], stars: [], studios: [], platforms: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const currentStep = STEPS[step]

  useEffect(() => { loadData() }, [currentStep])

  const loadData = async () => {
    setLoading(true)
    const { data: rows } = await supabase.from(currentStep).select('*').eq('is_active', true).order('sort_order')
    setData(prev => ({ ...prev, [currentStep]: rows || [] }))
    setLoading(false)
  }

  const toggle = (id) => {
    setSelections(prev => {
      const current = prev[currentStep]
      const exists = current.includes(id)
      return { ...prev, [currentStep]: exists ? current.filter(x => x !== id) : [...current, id] }
    })
  }

  const next = async () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else await finish()
  }

  const finish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    const entityTypeMap = { categories: 'category', stars: 'star', studios: 'studio', platforms: 'platform' }
    const follows = []
    for (const entityKey of STEPS) {
      for (const entityId of selections[entityKey]) {
        follows.push({ user_id: user.id, entity_type: entityTypeMap[entityKey], entity_id: entityId })
      }
    }

    if (follows.length > 0) await supabase.from('user_follows').insert(follows)
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)
    router.push('/home')
  }

  const skip = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else finish()
  }

  const items = data[currentStep] || []
  const selected = selections[currentStep] || []

  return (
    <div style={styles.page}>
      <div style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ ...styles.progressDot, background: i <= step ? 'var(--accent)' : 'var(--border2)', width: i === step ? 48 : 32 }} />
        ))}
      </div>

      <div style={styles.header}>
        <div style={styles.logo}>Nu<span style={{ color: 'var(--accent)' }}>Dex</span></div>
        <div style={styles.stepCount}>{step + 1} / {STEPS.length}</div>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>{STEP_LABELS[currentStep].title}</h1>
        <p style={styles.sub}>{STEP_LABELS[currentStep].sub}</p>

        {loading ? (
          <div style={styles.grid}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={styles.skeleton} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>No {currentStep} added yet.</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Add them from the admin panel.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {items.map(item => {
              const isSelected = selected.includes(item.id)
              return (
                <div key={item.id} onClick={() => toggle(item.id)}
                  style={{ ...styles.card, ...(isSelected ? styles.cardActive : {}) }}>
                  <div style={styles.imageWrap}>
                    {item.cover_image_url ? (
                      <img src={item.cover_image_url} alt={item.name}
                        style={{ ...styles.img, transform: isSelected ? 'scale(1.08)' : 'scale(1)' }} />
                    ) : (
                      <div style={styles.imgPlaceholder}>🎬</div>
                    )}
                    <div style={{ ...styles.overlay, opacity: isSelected ? 1 : 0 }} />
                    {isSelected && <div style={styles.check}>✓</div>}
                  </div>
                  <div style={styles.cardName}>{item.name}</div>
                </div>
              )
            })}
          </div>
        )}

        {selected.length > 0 && (
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
            {selected.length} selected
          </p>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={skip} style={styles.skipBtn}>
          {step < STEPS.length - 1 ? 'Skip' : 'Skip & finish'}
        </button>
        <button onClick={next} disabled={saving} style={styles.nextBtn}>
          {saving ? 'Saving...' : step < STEPS.length - 1 ? 'Continue →' : 'Go to my feed →'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '24px 24px 32px' },
  progressBar: { display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  progressDot: { height: 3, borderRadius: 2, transition: 'all 0.3s' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 },
  stepCount: { fontSize: 13, color: 'var(--text3)' },
  content: { flex: 1, maxWidth: 900, margin: '0 auto', width: '100%' },
  title: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'var(--text2)', fontSize: 15, marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 },
  card: {
    cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
    border: '2px solid transparent', transition: 'border-color 0.2s, transform 0.15s',
    background: 'var(--bg2)',
  },
  cardActive: { borderColor: 'var(--accent)', transform: 'scale(1.02)' },
  imageWrap: { width: '100%', aspectRatio: '16/10', position: 'relative', overflow: 'hidden', background: 'var(--bg3)' },
  img: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', display: 'block' },
  imgPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: 'var(--bg3)' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(192,132,252,0.2)', transition: 'opacity 0.2s' },
  check: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  cardName: { padding: '8px 10px', fontSize: 13, fontWeight: 500, color: 'var(--text)' },
  skeleton: { borderRadius: 10, aspectRatio: '16/10', background: 'var(--bg2)' },
  empty: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '32px auto 0', width: '100%' },
  skipBtn: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 14, padding: '10px 0', cursor: 'pointer' },
  nextBtn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer' },
}
