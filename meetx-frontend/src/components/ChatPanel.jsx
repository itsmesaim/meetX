import { useState, useEffect, useRef } from "react";
import styles from "./ChatPanel.module.css";

export default function ChatPanel({
  messages,
  onSend,
  connected,
  currentUser,
  onClose,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const fmt = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    acc.push({ ...msg, isFirst: !prev || prev.sender !== msg.sender });
    return acc;
  }, []);

  return (
    <div className={styles.panel}>
      {/* Header — clean, no "Live" text */}
      <div className={styles.header}>
        <div className={styles.handle} />
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <span className={styles.title}>Messages</span>
            {messages.length > 0 && (
              <span className={styles.count}>{messages.length}</span>
            )}
          </div>
          <div className={styles.headerRight}>
            {/* Subtle connection dot, no text */}
            <div
              className={`${styles.dot} ${connected ? styles.dotOn : styles.dotOff}`}
              title={connected ? "Connected" : "Connecting…"}
            />
            {onClose && (
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close chat"
              >
                <CloseIco />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {grouped.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ChatIco />
            </div>
            <p className={styles.emptyTitle}>No messages yet</p>
            <p className={styles.emptySub}>Start the conversation</p>
          </div>
        )}
        {grouped.map((m, i) => {
          const mine = m.sender === currentUser;
          return (
            <div
              key={m.id || i}
              className={`${styles.group} ${mine ? styles.mine : styles.theirs} ${m.isFirst ? styles.first : styles.cont}`}
            >
              {!mine && m.isFirst && (
                <div className={styles.senderRow}>
                  <div className={styles.avatar}>
                    {(m.sender || "?")[0].toUpperCase()}
                  </div>
                  <span className={styles.sender}>{m.sender}</span>
                </div>
              )}
              <div className={styles.bubbleRow}>
                {!mine && !m.isFirst && <div className={styles.spacer} />}
                <div
                  className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}
                >
                  {m.content}
                </div>
              </div>
              {m.isFirst && (
                <div
                  className={`${styles.time} ${mine ? styles.timeRight : styles.timeLeft}`}
                >
                  {fmt(m.timestamp)}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className={styles.inputArea} onSubmit={handleSend}>
        <div className={styles.inputRow}>
          <textarea
            className={styles.textarea}
            placeholder={connected ? "Type a message…" : "Connecting…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={!connected}
            rows={1}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!connected || !input.trim()}
          >
            <SendIco />
          </button>
        </div>
      </form>
    </div>
  );
}

const sv = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
function SendIco() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...sv}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function CloseIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...sv}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChatIco() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sv}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
