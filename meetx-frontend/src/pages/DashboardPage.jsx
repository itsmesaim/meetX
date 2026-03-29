import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { token, user }       = useAuth()
  const navigate               = useNavigate()
  const [joinCode, setJoinCode]   = useState('')
  const [creating, setCreating]   = useState(false)
  const [joining, setJoining]     = useState(false)
  const [error, setError]         = useState('')

  const handleCreate = async () => {
    setError('')
    setCreating(true)
    try {
      const room = await api.createRoom(token)
      navigate(`/room/${room.roomCode}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setError('')
    setJoining(true)
    try {
      await api.joinRoom(joinCode.trim().toUpperCase(), token)
      navigate(`/room/${joinCode.trim().toUpperCase()}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Background mesh */}
      <div className={styles.mesh} aria-hidden="true">
        <div className={styles.meshBlob1} />
        <div className={styles.meshBlob2} />
        <div className={styles.grid} />
      </div>

      <main className={styles.main}>
        {/* Hero */}
        <section className={`${styles.hero} anim-fade-up`}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Live & ready
          </div>
          <h1 className={styles.heroTitle}>
            Video meetings,<br />
            <span className={styles.heroAccent}>zero friction.</span>
          </h1>
          <p className={styles.heroSub}>
            One click to create a room. Share the code. Start talking.
          </p>
        </section>

        {/* Action cards */}
        <section className={styles.cards}>
          {/* Create card */}
          <div className={`${styles.card} ${styles.cardCreate} anim-fade-up anim-delay-1`}>
            <div className={styles.cardIcon}>
              <VideoIcon />
            </div>
            <h2 className={styles.cardTitle}>New meeting</h2>
            <p className={styles.cardSub}>
              Generate a room code instantly and share it with anyone.
            </p>
            <button
              className={`btn btn-primary ${styles.cardBtn}`}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <span className="spinner" /> : (
                <>
                  <PlusIcon />
                  Start a meeting
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Join card */}
          <div className={`${styles.card} ${styles.cardJoin} anim-fade-up anim-delay-2`}>
            <div className={styles.cardIcon}>
              <LinkIcon />
            </div>
            <h2 className={styles.cardTitle}>Join a meeting</h2>
            <p className={styles.cardSub}>
              Enter a room code from your host to jump right in.
            </p>
            <form onSubmit={handleJoin} className={styles.joinForm}>
              <input
                className={`input-field ${styles.codeInput}`}
                type="text"
                placeholder="XXXX-XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={9}
              />
              <button
                type="submit"
                className={`btn btn-ghost ${styles.cardBtn}`}
                disabled={joining || !joinCode.trim()}
              >
                {joining ? <span className="spinner spinner-light" /> : 'Join room'}
              </button>
            </form>
          </div>
        </section>

        {error && (
          <div className={`${styles.errorBanner} anim-fade-up`}>
            <WarnIcon /> {error}
          </div>
        )}

        {/* Features strip */}
        <section className={`${styles.features} anim-fade-up anim-delay-3`}>
          {FEATURES.map((f) => (
            <div key={f.label} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span className={styles.featureLabel}>{f.label}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

const FEATURES = [
  { icon: '🔒', label: 'End-to-end encrypted' },
  { icon: '⚡', label: 'Ultra-low latency' },
  { icon: '💬', label: 'Real-time chat' },
  { icon: '🌐', label: 'Works everywhere' },
]

function VideoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
      <rect x="3" y="8" width="12" height="8" rx="2" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
