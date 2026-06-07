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
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useChat } from "../hooks/useChat.js";
import ChatPanel from "../components/ChatPanel.jsx";
import styles from "./RoomPage.module.css";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const [lkToken, setLkToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [waitingUsers, setWaiting] = useState([]);
  const [admissionState, setAdmission] = useState("idle");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const stompRef = useRef(null);
  const initDoneRef = useRef(false); // StrictMode double-run fix
  const handledRef = useRef(new Set()); // Tracks admitted/denied emails

  const userName = user?.name || user?.email || "Guest";
  const userEmail = user?.email || user?.name || "guest";

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Wake lock ─────────────────────────────────────────────────────────────
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
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wl?.release().catch(() => {});
    };
  }, []);

  // ── Join flow ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code || !token) return;
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    setLoading(true);

    // Read & immediately clear sessionStorage (before any async)
    const sessionHost = sessionStorage.getItem("meetx_host_room") === code;
    if (sessionHost) sessionStorage.removeItem("meetx_host_room");

    // Check localStorage for persisted role (refresh case)
    const savedRole = localStorage.getItem(`meetx_role_${code}`);
    const amHost = sessionHost || savedRole === "host";
    const canAutoJoin = amHost || savedRole === "admitted";

    // Persist host role
    if (sessionHost) localStorage.setItem(`meetx_role_${code}`, "host");
    setIsHost(amHost);

    api
      .joinRoom(code, token)
      .then(async () => {
        if (canAutoJoin) {
          // Host or previously admitted — enter directly
          const lkData = await api.getLiveKitToken(code, userName, token);
          setLkToken(lkData.token);
          setAdmission("admitted");
          if (amHost) {
            setupHostStomp(code);
          } else {
            setupGuestStompAdmitted(code); // listen for kicks only
          }
        } else {
          // New guest — wait for admission
          setupGuestStomp(code);
          setAdmission("waiting");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code, token]);

  // ── Host STOMP — listen for knocks & manage kicks ─────────────────────────
  const setupHostStomp = (roomCode) => {
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 3000,
      onConnect: () => {
        console.log(" Host STOMP connected");

        client.subscribe(`/topic/room/${roomCode}/knocks`, (msg) => {
          const knock = JSON.parse(msg.body);
          if (handledRef.current.has(knock.email)) return;
          setWaiting((prev) =>
            prev.find((u) => u.email === knock.email) ? prev : [...prev, knock],
          );
        });

        client.subscribe(`/topic/room/${roomCode}/kicks`, () => {});
      },
      onStompError: (frame) => {
        console.error("❌ Host STOMP error:", frame);
      },
    });
    client.activate();
    stompRef.current = client;
  };

  // ── Guest STOMP,  waiting for admission ───────────────────────────────────
  const setupGuestStomp = (roomCode) => {
    let pollInterval = null;

    // Poll REST every 2 seconds
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const result = await api.checkAdmission(roomCode, userEmail, token);
          if (result?.admitted) {
            clearInterval(pollInterval);
            const lkData = await api.getLiveKitToken(roomCode, userName, token);
            setLkToken(lkData.token);
            localStorage.setItem(`meetx_role_${roomCode}`, "admitted");
            setAdmission("admitted");
            setupGuestStompAdmitted(roomCode);
          } else if (result?.denied) {
            //  Denied. stop everything
            clearInterval(pollInterval);
            client.deactivate();
            setAdmission("rejected");
          }
        } catch {}
      }, 2000);
    };

    // STOMP only for sending knock notification
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 3000,
      onConnect: () => {
        // Listen for kicks
        client.subscribe(`/topic/room/${roomCode}/kicks`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.email === userEmail) {
            clearInterval(pollInterval);
            localStorage.removeItem(`meetx_role_${roomCode}`);
            navigate("/");
          }
        });

        // Send knock every 4s so host sees it
        const sendKnock = () => {
          if (client.active) {
            client.publish({
              destination: `/app/room/${roomCode}/knock`,
              body: JSON.stringify({ email: userEmail, name: userName }),
            });
          }
        };
        sendKnock();
        // const knockInterval = setInterval(sendKnock, 4000);

        // Start polling for admission
        startPolling();

        // Cleanup on disconnect
        // client.onDisconnect = () => clearInterval(knockInterval);
      },
    });

    client.activate();
    stompRef.current = client;
  };

  // ── Admitted guest STOMP — only listens for kicks ─────────────────────────
  const setupGuestStompAdmitted = (roomCode) => {
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/room/${roomCode}/kicks`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.email === userEmail) {
            localStorage.removeItem(`meetx_role_${roomCode}`);
            alert("You have been removed from the meeting.");
            navigate("/");
          }
        });
      },
    });
    client.activate();
    stompRef.current = client;
  };

  // ── Host: admit or deny ───────────────────────────────────────────────────
  const handleAdmit = async (knockUser, admitted) => {
    handledRef.current.add(knockUser.email); // Mark handled immediately
    setWaiting((prev) => prev.filter((u) => u.email !== knockUser.email));
    try {
      await api.admitUser(code, knockUser.email, admitted, token);
    } catch (e) {
      console.error("Admit failed:", e);
    }
  };

  // ── Host: kick participant ─────────────────────────────────────────────────
  const handleKick = useCallback(
    (email) => {
      stompRef.current?.publish({
        destination: `/app/room/${code}/kick`,
        body: JSON.stringify({ email }),
      });
    },
    [code],
  );

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnected = useCallback(() => {
    api.notifyLeave(code, token).catch(() => {});
    stompRef.current?.deactivate();
    // Host leaves: clear host role so others need re-admission next time
    if (isHost) localStorage.removeItem(`meetx_role_${code}`);
    navigate("/");
  }, [code, token, navigate, isHost]);

  const handleConnected = useCallback(() => {
    api.notifyJoin(code, token).catch(() => {});
  }, [code, token]);

  // ── Timer string ──────────────────────────────────────────────────────────
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

  // ── Screens ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <FullScreen>
        <div className={styles.loadSpinner} />
        <p className={styles.loadText}>
          Joining <span className={styles.loadCode}>{code}</span>
        </p>
      </FullScreen>
    );

  if (error)
    return (
      <FullScreen>
        <p className={styles.errorText}>{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </FullScreen>
    );

  if (admissionState === "waiting")
    return (
      <FullScreen>
        <div className={styles.waitCard}>
          <div className={styles.waitRipple}>
            <div className={styles.waitAvatar}>{userName[0].toUpperCase()}</div>
          </div>
          <h2 className={styles.waitTitle}>Waiting to be admitted</h2>
          <p className={styles.waitSub}>The host will let you in shortly</p>
          <div className={styles.waitCode}>{code}</div>
          <button className={styles.waitLeave} onClick={() => navigate("/")}>
            Leave
          </button>
        </div>
      </FullScreen>
    );

  if (admissionState === "rejected")
    return (
      <FullScreen>
        <div className={styles.rejectedCard}>
          <div className={styles.rejectedIcon}>✕</div>
          <h2 className={styles.waitTitle}>Entry declined</h2>
          <p className={styles.waitSub}>
            The host didn't admit you to this meeting.
          </p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 16 }}
            onClick={() => navigate("/")}
          >
            ← Go back
          </button>
        </div>
      </FullScreen>
    );

  // ── Main room ──────────────────────────────────────────────────────────────
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
        <VideoGrid />

        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <div className={styles.brandMark}>
              <svg
                width="14"
                height="14"
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
            </div>
            <span className={styles.roomCode}>{code}</span>
          </div>
          <div className={styles.topRight}>
            <button className={styles.topBtn} onClick={toggleTheme}>
              {theme === "dark" ? <SunIco /> : <MoonIco />}
            </button>
          </div>
        </div>

        {/* Host: knock notifications */}
        {isHost && waitingUsers.length > 0 && (
          <div className={styles.knockStack}>
            {waitingUsers.map((u) => (
              <div key={u.email} className={styles.knockCard}>
                <div className={styles.knockAvatar}>
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className={styles.knockInfo}>
                  <p className={styles.knockName}>{u.name}</p>
                  <p className={styles.knockSub}>wants to join</p>
                </div>
                <button
                  className={styles.btnAdmit}
                  onClick={() => handleAdmit(u, true)}
                >
                  Admit
                </button>
                <button
                  className={styles.btnDeny}
                  onClick={() => handleAdmit(u, false)}
                >
                  Deny
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating controls */}
        <div className={styles.ctrlFloat}>
          <FloatingControls
            timer={timer}
            onInvite={() => setShowInvite(true)}
            onLeave={handleDisconnected}
            isHost={isHost}
            onKick={handleKick}
          />
        </div>

        {/* Chat FAB */}
        <button
          className={`${styles.chatFab} ${chatOpen ? styles.chatFabOpen : ""}`}
          onClick={() => {
            setChatOpen((v) => !v);
            if (!chatOpen) setUnread(0);
          }}
        >
          <ChatIco />
          {unread > 0 && !chatOpen && (
            <span className={styles.unreadBadge}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* Chat drawer */}
        {chatOpen && (
          <div className={`${styles.chatDrawer} anim-slide-up`}>
            <ChatSection
              roomCode={code}
              currentUser={userName}
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
              <h3 className={styles.inviteTitle}>Invite to meeting</h3>
              <button
                className={styles.xBtn}
                onClick={() => setShowInvite(false)}
              >
                <CloseIco />
              </button>
            </div>
            <div className={styles.codeBlock}>
              <p className={styles.codeBlockLabel}>ROOM CODE</p>
              <p className={styles.codeBlockVal}>{code}</p>
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
              {copied ? "✓ Copied!" : "Copy invite link"}
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

// ── Video grid ─────────────────────────────────────────────────────────────────
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

// ── Floating controls ──────────────────────────────────────────────────────────
function FloatingControls({ timer, onInvite, onLeave, isHost, onKick }) {
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [screen, setScreen] = useState(false);
  const [screenErr, setScreenErr] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const n = !mic;
    await localParticipant.setMicrophoneEnabled(n);
    setMic(n);
  };

  const toggleCam = async () => {
    if (!localParticipant) return;
    const n = !cam;
    await localParticipant.setCameraEnabled(n, { facingMode: "user" });
    setCam(n);
  };

  const toggleScreen = async () => {
    if (!localParticipant) return;
    setScreenErr("");
    try {
      const n = !screen;
      await localParticipant.setScreenShareEnabled(n);
      setScreen(n);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "NotSupportedError") {
        setScreenErr("Screen sharing not supported on this browser.");
      } else if (err.name !== "AbortError") {
        setScreenErr("Could not share screen.");
      }
      setTimeout(() => setScreenErr(""), 4000);
    }
  };

  return (
    <>
      {screenErr && <div className={styles.screenErrToast}>{screenErr}</div>}

      {/* Participants panel (host only) */}
      {isHost && showParticipants && (
        <ParticipantsPanel
          onKick={onKick}
          onClose={() => setShowParticipants(false)}
        />
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
        <CtrlB onClick={onInvite} tip="Invite people">
          <InvIco />
        </CtrlB>

        {/* Host: participants / kick panel toggle */}
        {isHost && (
          <CtrlB
            on={showParticipants}
            onClick={() => setShowParticipants((v) => !v)}
            tip="Participants"
          >
            <PeopleIco />
          </CtrlB>
        )}

        <div className={styles.sep} />
        <button
          className={styles.leaveBtn}
          onClick={onLeave}
          title="Leave meeting"
        >
          <PhoneIco />
        </button>
      </div>
    </>
  );
}

// ── Participants panel with kick ───────────────────────────────────────────────
function ParticipantsPanel({ onKick, onClose }) {
  const { remoteParticipants } = useLocalParticipant();

  // Fallback: get participants from useTracks
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const participants = [
    ...new Map(
      tracks.map((t) => [t.participant.identity, t.participant]),
    ).values(),
  ];

  return (
    <div className={styles.participantsPanel}>
      <div className={styles.ppHeader}>
        <span className={styles.ppTitle}>
          Participants ({participants.length})
        </span>
        <button className={styles.ppClose} onClick={onClose}>
          <CloseIco />
        </button>
      </div>
      <div className={styles.ppList}>
        {participants.length === 0 && (
          <p className={styles.ppEmpty}>No other participants</p>
        )}
        {participants.map((p) => (
          <div key={p.identity} className={styles.ppRow}>
            <div className={styles.ppAvatar}>
              {(p.identity || "?")[0].toUpperCase()}
            </div>
            <span className={styles.ppName}>{p.identity}</span>
            <button
              className={styles.ppKick}
              onClick={() => onKick(p.identity)}
              title="Remove from meeting"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtrlB({ children, on, danger, accent, onClick, tip }) {
  return (
    <button
      className={`${styles.ctrlBtn} ${on && !danger ? styles.ctrlOn : ""} ${danger ? styles.ctrlDanger : ""} ${accent ? styles.ctrlAccent : ""}`}
      onClick={onClick}
      title={tip}
    >
      {children}
    </button>
  );
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function ChatSection({ roomCode, currentUser, token, onNew, onClose }) {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    api
      .getChatHistory(roomCode, token)
      .then((data) => setHistory(data || []))
      .catch(() => setHistory([]));
  }, [roomCode, token]);

  if (history === null)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          color: "rgba(255,255,255,0.3)",
          fontSize: "0.85rem",
        }}
      >
        Loading…
      </div>
    );
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

function FullScreen({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060810",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const sv = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
function MicIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function MicOffIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
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
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
      <rect x="3" y="8" width="12" height="8" rx="2" />
    </svg>
  );
}
function CamOffIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
      <path d="M15 13a3 3 0 1 1-4.24-2.76" />
    </svg>
  );
}
function ScreenIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function InvIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function PeopleIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function PhoneIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 3.07 8.63 19.79 19.79 0 0 1 0 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11z" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
function ChatIco() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function CloseIco() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...sv}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SunIco() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...sv}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIco() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...sv}>
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
    <svg width="13" height="13" viewBox="0 0 24 24" {...sv}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
