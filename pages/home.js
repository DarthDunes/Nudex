import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    if (prof && !prof.onboarding_complete) { router.push('/onboarding'); return }

    await loadFeed(user.id)
    setLoading(false)
  }

  const loadFeed = async (userId) => {
    // Get user's follows
    const { data: follows } = await supabase.from('user_follows').select('*').eq('user_id', userId)
    if (!follows || follows.length === 0) { setSections([]); return }

    const built = []

    // Group follows by entity_type
    const grouped = {}
    for (const f of follows) {
      if (!grouped[f.entity_type]) grouped[f.entity_type] = []
      grouped[f.entity_type].push(f.entity_id)
    }

    const typeLabels = { category: 'Categories', star: 'Performers', studio: 'Studios', platform: 'Platforms' }
    const typeOrder = ['star', 'category', 'studio', 'platform']

    for (const entityType of typeOrder) {
      const ids = grouped[entityType]
      if (!ids || ids.length === 0) continue

      // Get entity names
      const tableName = entityType === 'category' ? 'categories' : entityType + 's'
      const { data: entities } = await supabase.from(tableName).select('id, name').in('id', ids)

      for (const entity of (entities || [])) {
        // Get content links for this entity
        const { data: links } = await supabase
          .from('content_links')
          .select('*, platforms(name)')
          .eq('entity_type', entityType)
          .eq('entity_id', entity.id)
          .eq('is_active', true)
          .order('sort_order')

        if (links && links.length > 0) {
          built.push({ label: entity.name, type: entityType, links })
        }
      }
    }

    setSections(built)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text3)' }}>Loading your feed...</div>
    </div>
  )

  return (
    <div style={styles.page}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <div style={styles.logo}>Nu<span style={{ color: 'var(--accent)' }}>Dex</span></div>
        <div style={styles.topRight}>
          <span style={styles.username}>{profile?.username}</span>
          <button onClick={signOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Your feed, {profile?.username}</h1>
        <p style={styles.heroSub}>Personalized content from across the web</p>
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyCard}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>Your feed is empty</p>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
              No content has been added yet. Check back soon.
            </p>
            <button onClick={() => router.push('/onboarding')} style={styles.reOnboardBtn}>
              Update preferences
            </button>
          </div>
        </div>
      ) : (
        sections.map((section, i) => (
          <CarouselSection key={i} section={section} />
        ))
      )}
    </div>
  )
}

function CarouselSection({ section }) {
  const trackRef = useRef(null)

  const scroll = (dir) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
    }
  }

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>
          <span style={styles.sectionTypeTag}>{section.type}</span>
          {section.label}
        </div>
        <div style={styles.scrollBtns}>
          <button onClick={() => scroll(-1)} style={styles.scrollBtn}>←</button>
          <button onClick={() => scroll(1)} style={styles.scrollBtn}>→</button>
        </div>
      </div>
      <div ref={trackRef} style={styles.track}>
        {section.links.map(link => (
          <ContentCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  )
}

function ContentCard({ link }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={styles.thumb}>
        {link.thumbnail_url ? (
          <img
            src={link.thumbnail_url}
            alt={link.title || ''}
            style={{ ...styles.thumbImg, transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={styles.thumbPlaceholder}>▶</div>
        )}
        {hovered && (
          <div style={styles.thumbOverlay}>
            <div style={styles.playBtn}>▶</div>
          </div>
        )}
        {link.platforms?.name && (
          <div style={styles.platformBadge}>{link.platforms.name}</div>
        )}
      </div>

      {/* Info */}
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{link.title || 'Untitled'}</div>
      </div>
    </a>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 28px', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
  },
  logo: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 },
  topRight: { display: 'flex', alignItems: 'center', gap: 16 },
  username: { fontSize: 13, color: 'var(--text2)' },
  signOutBtn: { background: 'none', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 12px', color: 'var(--text3)', fontSize: 12 },
  hero: { padding: '36px 28px 12px' },
  heroTitle: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 6 },
  heroSub: { color: 'var(--text3)', fontSize: 14 },
  emptyState: { padding: '60px 28px', display: 'flex', justifyContent: 'center' },
  emptyCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 40px', textAlign: 'center', maxWidth: 400 },
  reOnboardBtn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontSize: 14, fontFamily: 'var(--font-display)' },
  section: { padding: '28px 28px 8px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 },
  sectionTypeTag: { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollBtns: { display: 'flex', gap: 6 },
  scrollBtn: { background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 6, width: 30, height: 30, color: 'var(--text2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  track: { display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' },
  card: { flexShrink: 0, width: 220, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'block', transition: 'border-color 0.2s', cursor: 'pointer' },
  thumb: { width: '100%', aspectRatio: '16/9', background: 'var(--bg3)', overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  thumbPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--border2)' },
  thumbOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', backdropFilter: 'blur(4px)' },
  platformBadge: { position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#aaa' },
  cardInfo: { padding: '8px 10px 10px' },
  cardTitle: { fontSize: 12, color: 'var(--text2)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
}
