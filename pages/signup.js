import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '', email: '' })
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setError('')
    if (!form.username || !form.password) return setError('Username and password are required.')
    if (!ageConfirmed) return setError('You must confirm you are 18 or older.')

    setLoading(true)
    // Use email or generate a fake one from username
    const email = form.email || `${form.username}@nudex.user`

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { username: form.username } }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Go to onboarding
    router.push('/onboarding')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Nu<span style={{ color: 'var(--accent)' }}>Dex</span></div>
        <p style={styles.sub}>The adult content discovery platform</p>

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input name="username" value={form.username} onChange={handle} placeholder="Choose a username" style={styles.input} autoComplete="off" />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input name="password" type="password" value={form.password} onChange={handle} placeholder="Choose a password" style={styles.input} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
          <input name="email" type="email" value={form.email} onChange={handle} placeholder="your@email.com" style={styles.input} />
        </div>

        <label style={styles.checkRow}>
          <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.4 }}>
            I confirm that I am <strong style={{ color: 'var(--text)' }}>18 years of age or older</strong> and agree to access adult content.
          </span>
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <button onClick={submit} disabled={loading} style={styles.btn}>
          {loading ? 'Creating account...' : 'Create account →'}
        </button>

        <p style={styles.login}>
          Already have an account?{' '}
          <span onClick={() => router.push('/login')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Sign in</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: '24px',
  },
  card: {
    width: '100%', maxWidth: 420, background: 'var(--bg2)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20,
  },
  logo: {
    fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
    letterSpacing: 1, color: 'var(--text)',
  },
  sub: { color: 'var(--text3)', fontSize: 14, marginTop: -12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: 'var(--text2)', fontWeight: 500 },
  input: {
    background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
    padding: '10px 14px', color: 'var(--text)', fontSize: 15, outline: 'none',
    transition: 'border-color 0.2s',
  },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' },
  error: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13,
  },
  btn: {
    background: 'var(--accent2)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius)', padding: '13px 20px', fontSize: 15,
    fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: 0.5,
    transition: 'opacity 0.2s',
    marginTop: 4,
  },
  login: { textAlign: 'center', fontSize: 13, color: 'var(--text3)' },
}
