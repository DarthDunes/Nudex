import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setError('')
    if (!form.username || !form.password) return setError('Please fill in all fields.')
    setLoading(true)

    const email = form.username.includes('@') ? form.username : `${form.username}@nudex.user`

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: form.password })

    if (signInError) {
      setError('Invalid username or password.')
      setLoading(false)
      return
    }

    router.push('/home')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Nu<span style={{ color: 'var(--accent)' }}>Dex</span></div>
        <p style={styles.sub}>Welcome back</p>

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input name="username" value={form.username} onChange={handle} placeholder="Your username" style={styles.input} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input name="password" type="password" value={form.password} onChange={handle} placeholder="Your password" style={styles.input}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button onClick={submit} disabled={loading} style={styles.btn}>
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>

        <p style={styles.signup}>
          No account yet?{' '}
          <span onClick={() => router.push('/signup')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Create one</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  card: { width: '100%', maxWidth: 420, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20 },
  logo: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: 1 },
  sub: { color: 'var(--text3)', fontSize: 14, marginTop: -12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: 'var(--text2)', fontWeight: 500 },
  input: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 15, outline: 'none' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 },
  btn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '13px 20px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' },
  signup: { textAlign: 'center', fontSize: 13, color: 'var(--text3)' },
}
