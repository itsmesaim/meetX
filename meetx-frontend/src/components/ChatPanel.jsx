import { useState, useEffect, useRef } from 'react'
import styles from './ChatPanel.module.css'

export default function ChatPanel({ messages, onSend, connected, currentUser }) {
  const [input, setInput] = useState('')
  const bottomRef         = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    onSend(input)
    setInput('')
  }

  const handleKey = (e) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const fmt = (ts) => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Group consecutive messages from the same sender
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1]
    const isFirst = !prev || prev.sender !== msg.sender
    acc.push({ ...msg, isFirst })
    return acc
  }, [])

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ChatBubbleIcon />
          <span className={styles.title}>Chat</span>
          {messages.length > 0 && (
            <span className={styles.count}>{messages.length}</span>
          )}
        </div>
        <div className={styles.statusPill}>
          <span className={`${styles.dot} ${connected ? styles.dotOn : styles.dotOff}`} />
          <span className={styles.statusLabel}>{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {grouped.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <p className={styles.emptyTitle}>No messages yet</p>
            <p className={styles.emptySub}>Be the first to say hello!</p>
          </div>
        )}

        {grouped.map((m, i) => {
          const mine = m.sender === currentUser
          return (
            <div
              key={m.id || i}
              className={`
                ${styles.msgGroup}
                ${mine ? styles.mine : styles.theirs}
                ${m.isFirst ? styles.first : styles.continued}
              `}
            >
              {/* Sender avatar + name — only for first in a run, not mine */}
              {!mine && m.isFirst && (
                <div className={styles.senderRow}>
                  <div className={styles.avatar}>
                    {(m.sender || '?')[0].toUpperCase()}
                  </div>
                  <span className={styles.senderName}>{m.sender}</span>
                </div>
              )}

              <div className={styles.bubbleRow}>
                {/* Spacer keeps "theirs" bubbles right-aligned under avatar */}
                {!mine && !m.isFirst && <div className={styles.avatarSpacer} />}

                <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                  {m.content}
                </div>
              </div>

              <div className={`${styles.meta} ${mine ? styles.metaRight : styles.metaLeft}`}>
                {fmt(m.timestamp)}
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className={styles.inputArea} onSubmit={handleSend}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textarea}
            placeholder={connected ? 'Type a message… (Enter to send)' : 'Connecting to chat…'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!connected}
            rows={1}
            autoComplete="off"
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!connected || !input.trim()}
            title="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Icons ── */
function ChatBubbleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}
