import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useChat } from "../hooks/useChat.js";
import ChatPanel from "../components/ChatPanel.jsx";
import styles from "./RoomPage.module.css";

const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL || "wss://your-livekit-host.livekit.cloud";

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [lkToken, setLkToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!code || !token) return;
    setLoading(true);
    api
      .joinRoom(code, token)
      .then(() => api.getLiveKitToken(code, user?.name || user?.email, token))
      .then((d) => setLkToken(d.token))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code, token, user]);

  useEffect(() => {
    let wl = null;
    const req = async () => {
      try {
        if ("wakeLock" in navigator)
          wl = await navigator.wakeLock.request("screen");
      } catch {}
    };
    req();
    const onVis = () => {
      if (document.visibilityState === "visible") req();
    };
    document.addEventListener("visibilitychange", onVis);
    const tid = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(tid);
      document.removeEventListener("visibilitychange", onVis);
      if (wl) wl.release().catch(() => {});
    };
  }, []);

  const handleConnected = useCallback(() => {
    api.notifyJoin(code, token).catch(() => {});
  }, [code, token]);
  const handleDisconnected = useCallback(() => {
    api.notifyLeave(code, token).catch(() => {});
    navigate("/");
  }, [code, token, navigate]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss2 = String(seconds % 60).padStart(2, "0");
  const hh = Math.floor(seconds / 3600);
  const timer =
    hh > 0 ? `${String(hh).padStart(2, "0")}:${mm}:${ss2}` : `${mm}:${ss2}`;

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return (
      <Screen>
        <span
          className="spinner spinner-light"
          style={{ width: 28, height: 28 }}
        />
        <p
          style={{ color: "var(--text-2)", marginTop: 14, fontSize: "0.9rem" }}
        >
          Joining{" "}
          <strong
            style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}
          >
            {code}
          </strong>
          …
        </p>
      </Screen>
    );
  if (tokenError)
    return (
      <Screen>
        <p
          style={{ color: "var(--red)", marginBottom: 16, textAlign: "center" }}
        >
          {tokenError}
        </p>
        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </Screen>
    );

  return (
    <div className={styles.page}>
      <LiveKitRoom
        token={lkToken}
        serverUrl={LIVEKIT_URL}
        connect
        video={false}
        audio={false}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        options={{ disconnectOnPageLeave: false }}
        className={styles.lkRoom}
      >
        <RoomAudioRenderer />

        {/* Full screen video */}
        <VideoGrid />

        {/* Minimal top overlay */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect
                width="32"
                height="32"
                rx="9"
                fill="var(--accent)"
                fillOpacity="0.15"
              />
              <path
                d="M8 12a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8Z"
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
              <path
                d="M20 14l4-2v8l-4-2"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.roomCodeBadge}>{code}</span>
          </div>
          <div className={styles.topRight}>
            <button className={styles.topBtn} onClick={toggleTheme}>
              {theme === "dark" ? <SunIco /> : <MoonIco />}
            </button>
          </div>
        </div>

        {/* Glassmorphism floating controls */}
        <div className={styles.ctrlFloat}>
          <FloatingControls
            timer={timer}
            onInvite={() => setShowInvite(true)}
            onLeave={handleDisconnected}
          />
        </div>

        {/* Chat bubble */}
        <button
          className={`${styles.chatBubble} ${chatOpen ? styles.chatOpen : ""}`}
          onClick={() => {
            setChatOpen((v) => !v);
            if (!chatOpen) setUnread(0);
          }}
        >
          <ChatIco />
          {unread > 0 && !chatOpen && (
            <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>

        {/* Chat panel */}
        {chatOpen && (
          <div className={`${styles.chatDrawer} anim-slide-up`}>
            <ChatSection
              roomCode={code}
              currentUser={user?.name || user?.email || "Anonymous"}
              token={token}
              onNew={() => {
                if (!chatOpen) setUnread((u) => u + 1);
              }}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}
      </LiveKitRoom>

      {/* Invite modal */}
      {showInvite && (
        <div
          className={styles.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}
        >
          <div className={`${styles.inviteCard} anim-scale-in`}>
            <div className={styles.inviteHead}>
              <span className={styles.inviteTitle}>Invite to call</span>
              <button
                className={styles.xBtn}
                onClick={() => setShowInvite(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.codeDisplay}>
              <p className={styles.codeLabel}>ROOM CODE</p>
              <p className={styles.codeVal}>{code}</p>
            </div>
            <div className={styles.linkBox}>
              <span className={styles.linkText}>
                {window.location.origin}/room/{code}
              </span>
            </div>
            <button
              className={`btn btn-primary ${styles.fullBtn}`}
              onClick={copyLink}
            >
              {copied ? "✓ Link copied!" : "Copy invite link"}
            </button>
            <div className={styles.shareRow}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join my MeetX!\nRoom: ${code}\n${window.location.origin}/room/${code}`)}`}
                target="_blank"
                rel="noreferrer"
                className={`btn btn-ghost ${styles.shareBtn}`}
              >
                <WAIco /> WhatsApp
              </a>
              <a
                href={`mailto:?subject=Join my MeetX call&body=${encodeURIComponent(`Room code: ${code}\n${window.location.origin}/room/${code}`)}`}
                className={`btn btn-ghost ${styles.shareBtn}`}
              >
                <MailIco /> Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Screen({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <div className={styles.videoWrap}>
      <GridLayout tracks={tracks} className={styles.grid}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

function FloatingControls({ timer, onInvite, onLeave }) {
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [screen, setScreen] = useState(false);
  const [screenErr, setScreenErr] = useState(""); // ✅ error state

  const toggleMic = async () => {
    if (!localParticipant) return;
    const n = !mic;
    await localParticipant.setMicrophoneEnabled(n);
    setMic(n);
  };

  // ✅ Fix: facingMode: 'user' — front camera on mobile
  const toggleCam = async () => {
    if (!localParticipant) return;
    const n = !cam;
    await localParticipant.setCameraEnabled(n, { facingMode: "user" });
    setCam(n);
  };

  // ✅ Fix: try karo, fail hone pe proper error dikhao
  const toggleScreen = async () => {
    if (!localParticipant) return;
    setScreenErr("");
    try {
      const n = !screen;
      await localParticipant.setScreenShareEnabled(n);
      setScreen(n);
    } catch (err) {
      if (err.name === "NotSupportedError" || err.name === "NotAllowedError") {
        setScreenErr("Screen sharing not supported on this browser/device.");
      } else if (err.name === "AbortError") {
        // User cancelled — no error needed
      } else {
        setScreenErr("Could not start screen share.");
      }
      setTimeout(() => setScreenErr(""), 4000); // auto clear
    }
  };

  return (
    <>
      {/* ✅ Screen share error toast */}
      {screenErr && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,77,106,0.15)",
            border: "1px solid rgba(255,77,106,0.3)",
            color: "#ff4d6a",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: "0.82rem",
            zIndex: 50,
            whiteSpace: "nowrap",
            backdropFilter: "blur(10px)",
          }}
        >
          {screenErr}
        </div>
      )}

      <div className={styles.pill}>
        <div className={styles.timerChip}>
          <span className={styles.timerDot} />
          <span className={styles.timerVal}>{timer}</span>
        </div>
        <div className={styles.sep} />
        <CtrlB
          on={mic}
          danger={!mic}
          onClick={toggleMic}
          tip={mic ? "Mute" : "Unmute"}
        >
          {mic ? <MicIco /> : <MicOffIco />}
        </CtrlB>
        <CtrlB
          on={cam}
          danger={!cam}
          onClick={toggleCam}
          tip={cam ? "Camera off" : "Camera on"}
        >
          {cam ? <CamIco /> : <CamOffIco />}
        </CtrlB>
        <CtrlB
          on={screen}
          accent={screen}
          onClick={toggleScreen}
          tip={screen ? "Stop sharing" : "Share screen"}
        >
          <ScreenIco />
        </CtrlB>
        <CtrlB onClick={onInvite} tip="Invite">
          <InvIco />
        </CtrlB>
        <div className={styles.sep} />
        <button className={styles.leaveBtn} onClick={onLeave}>
          <PhoneIco />
        </button>
      </div>
    </>
  );
}

function CtrlB({ children, on, danger, accent, onClick, tip }) {
  return (
    <button
      className={`${styles.ctrlBtn}
      ${on && !danger ? styles.ctrlOn : ""}
      ${danger ? styles.ctrlDanger : ""}
      ${accent ? styles.ctrlAccent : ""}`}
      onClick={onClick}
      title={tip}
    >
      {children}
    </button>
  );
}

function ChatSection({ roomCode, currentUser, token, onNew, onClose }) {
  const [history, setHistory] = useState(null); // null = still loading

  useEffect(() => {
    api
      .getChatHistory(roomCode, token)
      .then((data) => setHistory(data || []))
      .catch(() => setHistory([]));
  }, [roomCode, token]);

  if (history === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          color: "var(--text-3)",
          fontSize: "0.85rem",
        }}
      >
        Loading chat...
      </div>
    );
  }

  return (
    <ChatSectionReady
      roomCode={roomCode}
      currentUser={currentUser}
      history={history}
      onNew={onNew}
      onClose={onClose}
    />
  );
}

function ChatSectionReady({ roomCode, currentUser, history, onNew, onClose }) {
  const { messages, sendMessage, connected } = useChat(
    roomCode,
    currentUser,
    history,
  );
  const prev = useRef(0);
  useEffect(() => {
    if (messages.length > prev.current) onNew?.();
    prev.current = messages.length;
  }, [messages.length]);
  return (
    <ChatPanel
      messages={messages}
      onSend={sendMessage}
      connected={connected}
      currentUser={currentUser}
      onClose={onClose}
    />
  );
}

const ico = (d, w = 18) => (
  <svg
    width={w}
    height={w}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
function MicIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function MicOffIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function CamIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
      <rect x="3" y="8" width="12" height="8" rx="2" />
    </svg>
  );
}
function CamOffIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
      <path d="M15 13a3 3 0 1 1-4.24-2.76" />
    </svg>
  );
}
function ScreenIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function InvIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function PhoneIco() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.07 8.63 19.79 19.79 0 0 1 0 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11z" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
function ChatIco() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SunIco() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIco() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function WAIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function MailIco() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
