import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const STEPS = ['categories', 'stars', 'studios', 'platforms']
const STEP_LABELS = {
  categories: { title: 'What are you into?', sub: 'Pick your favorite categories' },
  stars: { title: 'Who do you follow?', sub: 'Select your favorite performers' },
  studios: { title: 'Any favorite studios?', sub: 'We\'ll surface their latest releases' },
  platforms: { title: 'Which platforms do you use?', sub: 'We\'ll connect you directly' },
}

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ categories: [], stars: [], studios: [], platforms: [] })
  const [selections, setSelections] = useState({ categories: [], stars: [], studios: [], platforms: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const currentStep = STEPS[step]

  useEffect(() => {
    loadData()
  }, [currentStep])

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
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      await finish()
    }
  }

  const finish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    // Save all follows
    const follows = []
    for (const entityType of STEPS) {
      for (const entityId of selections[entityType]) {
        follows.push({ user_id: user.id, entity_type: entityType.slice(0, -1) === 'categorie' ? 'category' : entityType.slice(0, -1), entity_id: entityId })
      }
    }

    // Fix entity_type mapping
    const mapped = follows.map(f => ({
      ...f,
      entity_type: f.entity_type === 'categorie' ? 'category' : 
                   f.entity_type === 'stare' ? 'star' :
                   f.entity_type === 'studioe' ? 'studio' :
                   f.entity_type === 'platform' ? 'platform' : f.entity_type
    }))

    if (mapped.length > 0) {
      await supabase.from('user_follows').insert(mapped)
    }

    // Mark onboarding complete
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
      {/* Progress bar */}
      <div style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ ...styles.progressDot, background: i <= step ? 'var(--accent)' : 'var(--border2)' }} />
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
          <div style={styles.empty}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>No {currentStep} added yet.</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>You can add them from your admin panel and they'll appear here.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {items.map(item => {
              const isSelected = selected.includes(item.id)
              return (
                <div key={item.id} onClick={() => toggle(item.id)} style={{ ...styles.pill, ...(isSelected ? styles.pillActive : {}) }}>
                  {isSelected && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓ </span>}
                  {item.name}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={skip} style={styles.skipBtn}>
          {step < STEPS.length - 1 ? 'Skip' : 'Skip & finish'}
        </button>
        <button onClick={next} style={styles.nextBtn}>
          {step < STEPS.length - 1 ? 'Continue →' : 'Go to my feed →'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '24px 24px 32px' },
  progressBar: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 },
  progressDot: { width: 32, height: 3, borderRadius: 2, transition: 'background 0.3s' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 },
  stepCount: { fontSize: 13, color: 'var(--text3)' },
  content: { flex: 1, maxWidth: 680, margin: '0 auto', width: '100%' },
  title: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'var(--text2)', fontSize: 15, marginBottom: 32 },
  empty: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  pill: {
    background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20,
    padding: '10px 18px', fontSize: 14, color: 'var(--text2)', cursor: 'pointer',
    transition: 'all 0.15s', userSelect: 'none',
  },
  pillActive: {
    background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
    color: 'var(--text)',
  },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 680, margin: '32px auto 0', width: '100%' },
  skipBtn: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 14, padding: '10px 0' },
  nextBtn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' },
}
