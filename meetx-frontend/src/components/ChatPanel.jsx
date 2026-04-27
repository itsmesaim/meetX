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
    onSend(input);
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
      {/* Handle bar + header */}
      <div className={styles.header}>
        <div className={styles.handle} />
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <span className={styles.title}>Chat</span>
            {messages.length > 0 && (
              <span className={styles.count}>{messages.length}</span>
            )}
          </div>
          <div className={styles.headerRight}>
            <div
              className={`${styles.dot} ${connected ? styles.dotOn : styles.dotOff}`}
            />
            <span className={styles.status}>
              {connected ? "Live" : "Connecting…"}
            </span>
            {onClose && (
              <button className={styles.closeBtn} onClick={onClose}>
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {grouped.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No messages yet</p>
            <p className={styles.emptySub}>Say hello 👋</p>
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
              <div
                className={`${styles.time} ${mine ? styles.timeRight : styles.timeLeft}`}
              >
                {fmt(m.timestamp)}
              </div>
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
            placeholder={connected ? "Message…" : "Connecting…"}
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
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
