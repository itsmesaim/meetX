import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useChat } from '../hooks/useChat.js'
import ChatPanel from '../components/ChatPanel.jsx'
import Controls from '../components/Controls.jsx'
import styles from './RoomPage.module.css'

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-host.livekit.cloud'

export default function RoomPage() {
  const { code }          = useParams()
  const navigate          = useNavigate()
  const { token, user }   = useAuth()

  const [lkToken, setLkToken]       = useState(null)
  const [loadingToken, setLoading]  = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [chatOpen, setChatOpen]     = useState(true)

  // Fetch LiveKit token from our backend
  useEffect(() => {
    if (!code || !token) return
    setLoading(true)
    api.getLiveKitToken(code, user?.name || user?.email, token)
      .then((data) => setLkToken(data.token))
      .catch((err) => setTokenError(err.message))
      .finally(() => setLoading(false))
  }, [code, token, user])

  const handleDisconnect = useCallback(() => {
    navigate('/')
  }, [navigate])

  if (loadingToken) return <LoadingScreen roomCode={code} />
  if (tokenError)   return <ErrorScreen message={tokenError} onBack={() => navigate('/')} />

  return (
    <div className={styles.page}>
      <RoomHeader
        roomCode={code}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLeave={handleDisconnect}
      />

      <LiveKitRoom
        token={lkToken}
        serverUrl={LIVEKIT_URL}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnect}
        className={styles.lkRoom}
      >
        <RoomAudioRenderer />
        <div className={styles.body}>
          <VideoSection chatOpen={chatOpen} />
          {chatOpen && (
            <ChatSection
              roomCode={code}
              currentUser={user?.name || user?.email || 'Anonymous'}
              token={token}
            />
          )}
        </div>
        <Controls onLeave={handleDisconnect} />
      </LiveKitRoom>
    </div>
  )
}

/* ── Video grid ─────────────────────────────────────────────────────────────── */
function VideoSection({ chatOpen }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera,      withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <div className={`${styles.videoSection} ${chatOpen ? styles.videoNarrow : ''}`}>
      <GridLayout tracks={tracks} className={styles.grid}>
        <ParticipantTile />
      </GridLayout>
    </div>
  )
}

/* ── Chat section ────────────────────────────────────────────────────────────── */
function ChatSection({ roomCode, currentUser, token }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    api.getChatHistory(roomCode, token)
      .then(setHistory)
      .catch(() => {}) // history is non-critical
  }, [roomCode, token])

  const { messages, sendMessage, connected } = useChat(roomCode, currentUser, history)

  return (
    <aside className={styles.chatAside}>
      <ChatPanel
        messages={messages}
        onSend={sendMessage}
        connected={connected}
        currentUser={currentUser}
      />
    </aside>
  )
}

/* ── Sub-components ────────────────────────────────────────────────────────── */
function RoomHeader({ roomCode, chatOpen, onToggleChat, onLeave }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <LogoMark />
        <div className={styles.roomCode}>
          <span className={styles.roomCodeLabel}>Room</span>
          <span className={styles.roomCodeValue}>{roomCode}</span>
          <button
            className={styles.copyBtn}
            onClick={copy}
            title="Copy room code"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      <div className={styles.headerRight}>
        <button
          className={`btn btn-ghost ${styles.headerBtn}`}
          onClick={onToggleChat}
          title={chatOpen ? 'Hide chat' : 'Show chat'}
        >
          <ChatIcon />
          <span className={styles.headerBtnLabel}>{chatOpen ? 'Hide chat' : 'Chat'}</span>
        </button>
        <button
          className={`btn btn-danger ${styles.headerBtn}`}
          onClick={onLeave}
          title="Leave meeting"
        >
          <PhoneOffIcon />
          <span className={styles.headerBtnLabel}>Leave</span>
        </button>
      </div>
    </header>
  )
}

function LoadingScreen({ roomCode }) {
  return (
    <div className={styles.fullScreen}>
      <div className={styles.loadingCard}>
        <span className="spinner spinner-light" style={{ width: 28, height: 28 }} />
        <p className={styles.loadingText}>Joining <strong>{roomCode}</strong>…</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className={styles.fullScreen}>
      <div className={styles.errorCard}>
        <p className={styles.errorMsg}>{message}</p>
        <button className="btn btn-ghost" onClick={onBack}>← Back to dashboard</button>
      </div>
    </div>
  )
}

/* ── Icons ── */
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="var(--teal)" fillOpacity="0.15"/>
      <path d="M8 12a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8Z" stroke="var(--teal)" strokeWidth="1.5"/>
      <path d="M20 14l4-2v8l-4-2" stroke="var(--teal)" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function PhoneOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.07 8.63 19.79 19.79 0 0 1 0 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11z"/><line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
  )
}
