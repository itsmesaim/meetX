import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import ScheduleModal from "../components/ScheduleModal.jsx";
import styles from "./DashboardPage.module.css";

const RECENT_KEY = "meetx_recent_rooms";
const MAX_RECENT = 3;

function getRecentRooms() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentRoom(code) {
  const prev = getRecentRooms().filter((c) => c !== code);
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify([code, ...prev].slice(0, MAX_RECENT)),
  );
}

export default function DashboardPage() {
  const { token, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [infoMeeting, setInfoMeeting] = useState(null);
  const [recentRooms, setRecentRooms] = useState(getRecentRooms);

  useEffect(() => {
    api
      .getMyMeetings(token)
      .then((data) =>
        setMeetings(
          data.filter(
            (m) =>
              m.hostEmail === user?.email ||
              (m.invitees && m.invitees.includes(user?.email)),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, [token]);

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      const r = await api.createRoom(token);
      sessionStorage.setItem("meetx_host_room", r.roomCode);
      saveRecentRoom(r.roomCode);
      navigate(`/room/${r.roomCode}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (code) => {
    const c = (code || joinCode).trim().toUpperCase();
    if (!c) return;
    setError("");
    setJoining(true);
    try {
      await api.joinRoom(c, token);
      saveRecentRoom(c);
      setRecentRooms(getRecentRooms());
      navigate(`/room/${c}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleScheduled = (m) => {
    setMeetings((p) =>
      [m, ...p].sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt),
      ),
    );
    setShowSchedule(false);
    setEditingMeeting(null);
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelMeeting(id, token);
      setMeetings((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleStartNow = async (id, roomCode) => {
    try {
      await api.startMeetingNow(id, token);
      sessionStorage.setItem("meetx_host_room", roomCode);
      navigate(`/room/${roomCode}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const firstName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const upcomingCount = meetings.filter((m) => m.status === "UPCOMING").length;
  const liveCount = meetings.filter((m) => m.status === "ACTIVE").length;

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.grid} />
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.navLogoMark}>
            <VideoIco />
          </div>
          <span className={styles.navBrand}>MeetX</span>
        </div>
        <div className={styles.navRight}>
          <button
            className={styles.themeBtn}
            onClick={toggle}
            title="Toggle theme"
          >
            {theme === "dark" ? <SunIco /> : <MoonIco />}
          </button>
          <div className={styles.userChip}>
            <div className={styles.avatar}>
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user?.name || user?.email}</span>
          </div>
          <button
            className={`btn btn-ghost ${styles.signOut}`}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogoutIco /> Sign out
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        {/* Greeting */}
        <div className={`${styles.greetRow} anim-fade-up`}>
          <div>
            <p className={styles.greetSub}>{greeting},</p>
            <h1 className={styles.greetName}>{firstName}.</h1>
          </div>
          {liveCount > 0 && (
            <div className={styles.liveAlert}>
              <span className={styles.livePulseDot} />
              {liveCount} meeting{liveCount > 1 ? "s" : ""} live right now
            </div>
          )}
        </div>

        {error && (
          <div className={`${styles.errBanner} anim-fade-up`}>
            <WarnIco /> {error}
          </div>
        )}

        {/* Bento grid */}
        <div className={`${styles.bento} anim-fade-up anim-delay-1`}>
          {/* Start card */}
          <div className={`${styles.bentoCard} ${styles.startCard}`}>
            <div className={styles.cardTopRow}>
              <span className={styles.cardLabel}>
                <VideoIco /> New meeting
              </span>
            </div>
            <p className={styles.cardHeading}>Start instantly</p>
            <p className={styles.cardSub}>
              A room is created — just share the code
            </p>
            <div className={styles.startActions}>
              <button
                className={styles.btnPrimary}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <PlayIco /> Start a meeting
                  </>
                )}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setShowSchedule(true)}
              >
                <CalIco /> Schedule for later
              </button>
            </div>
          </div>

          {/* Join card */}
          <div className={`${styles.bentoCard} ${styles.joinCard}`}>
            <div className={styles.cardTopRow}>
              <span className={styles.cardLabel}>
                <LinkIco /> Join a meeting
              </span>
            </div>
            <p className={styles.cardHeading}>Enter room code</p>
            <div className={styles.joinRow}>
              <input
                className={styles.codeInput}
                type="text"
                placeholder="XXXX-XXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={9}
              />
              <button
                className={styles.btnJoin}
                onClick={() => handleJoin()}
                disabled={joining || !joinCode.trim()}
              >
                {joining ? <span className="spinner" /> : <ArrowIco />}
              </button>
            </div>
            {recentRooms.length > 0 && (
              <div className={styles.recentRooms}>
                <p className={styles.recentLabel}>Recent</p>
                <div className={styles.recentPills}>
                  {recentRooms.map((code) => (
                    <button
                      key={code}
                      className={styles.recentPill}
                      onClick={() => handleJoin(code)}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats sidebar */}
          <div className={`${styles.bentoCard} ${styles.statsCard}`}>
            <span className={styles.cardLabel}>
              <ChartIco /> Overview
            </span>
            <div className={styles.statBlocks}>
              <div className={styles.statBlock}>
                <div className={styles.statVal}>{meetings.length}</div>
                <div className={styles.statLbl}>Total meetings</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statVal}>{upcomingCount}</div>
                <div className={styles.statLbl}>Upcoming</div>
              </div>
              {liveCount > 0 && (
                <div className={`${styles.statBlock} ${styles.statLive}`}>
                  <div className={styles.statVal}>{liveCount}</div>
                  <div className={styles.statLbl}>Live now</div>
                </div>
              )}
            </div>
            <div className={styles.statDivider} />
            <div className={styles.quickLinks}>
              <button
                className={styles.quickLink}
                onClick={() => setShowSchedule(true)}
              >
                <CalIco /> Schedule meeting
              </button>
              <button
                className={styles.quickLink}
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogoutIco /> Sign out
              </button>
            </div>
          </div>

          {/* Meetings card */}
          <div className={`${styles.bentoCard} ${styles.meetingsCard}`}>
            <div className={styles.cardTopRow}>
              <span className={styles.cardLabel}>
                <ClockIco /> Upcoming meetings
              </span>
              <span className={styles.meetCount}>{meetings.length}</span>
            </div>
            {loadingMeetings ? (
              <div className={styles.meetLoading}>
                <span className="spinner spinner-light" />
              </div>
            ) : meetings.length === 0 ? (
              <div className={styles.emptyState}>
                <CalIco />
                <p>No upcoming meetings</p>
                <button
                  className={styles.btnGhostSm}
                  onClick={() => setShowSchedule(true)}
                >
                  Schedule one →
                </button>
              </div>
            ) : (
              <div className={styles.meetList}>
                {meetings.map((m) => (
                  <MeetRow
                    key={m.id}
                    meeting={m}
                    userEmail={user?.email}
                    onJoin={() => navigate(`/room/${m.roomCode}`)}
                    onCancel={() => handleCancel(m.id)}
                    onEdit={() => setEditingMeeting(m)}
                    onStartNow={() => handleStartNow(m.id, m.roomCode)}
                    onInfo={() => setInfoMeeting(m)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showSchedule && (
        <ScheduleModal
          token={token}
          onClose={() => setShowSchedule(false)}
          onScheduled={handleScheduled}
        />
      )}
      {editingMeeting && (
        <ScheduleModal
          key={editingMeeting.id}
          token={token}
          editMode
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onScheduled={(m) => {
            setMeetings((p) => p.map((x) => (x.id === m.id ? m : x)));
            setEditingMeeting(null);
          }}
        />
      )}
      {infoMeeting && (
        <InfoModal meeting={infoMeeting} onClose={() => setInfoMeeting(null)} />
      )}
    </div>
  );
}

// MeetRow
function MeetRow({
  meeting,
  userEmail,
  onJoin,
  onCancel,
  onEdit,
  onStartNow,
  onInfo,
}) {
  const isHost = meeting.hostEmail === userEmail;
  const start = new Date(meeting.scheduledAt);
  const now = new Date();
  const isLive =
    Math.abs(now - start) < 15 * 60 * 1000 || meeting.status === "ACTIVE";
  const timeStr = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const isToday = start.toDateString() === now.toDateString();

  return (
    <div className={`${styles.meetRow} ${isLive ? styles.meetRowLive : ""}`}>
      <div className={styles.meetTimeCol}>
        <span className={styles.meetTimeVal}>{timeStr}</span>
        <span className={styles.meetDateVal}>
          {isToday ? "Today" : dateStr}
        </span>
      </div>
      <div
        className={`${styles.meetDot} ${isLive ? styles.meetDotLive : ""}`}
      />
      <div className={styles.meetInfo}>
        <div className={styles.meetTitleRow}>
          <span className={styles.meetTitle}>{meeting.title}</span>
          {isLive && <span className={styles.liveBadge}>LIVE</span>}
          {isHost && <span className={styles.hostBadge}>Host</span>}
        </div>
        <span className={styles.meetMeta}>
          {meeting.roomCode}
          {meeting.invitees?.length > 0 &&
            ` · ${meeting.invitees.length} invited`}
          {` · ${meeting.durationMinutes} min`}
        </span>
      </div>
      <div className={styles.meetBtns}>
        <button className={styles.btnRowSm} onClick={onInfo} title="Details">
          <InfoIco />
        </button>
        {isHost && meeting.status === "UPCOMING" && (
          <button className={styles.btnRowSm} onClick={onEdit}>
            Edit
          </button>
        )}
        {isHost && meeting.status === "UPCOMING" && (
          <button
            className={`${styles.btnRowSm} ${styles.btnRowPrimary}`}
            onClick={onStartNow}
          >
            Start now
          </button>
        )}
        {isLive && (
          <button
            className={`${styles.btnRowSm} ${styles.btnRowPrimary}`}
            onClick={onJoin}
          >
            Join
          </button>
        )}
        {isHost && meeting.status !== "ENDED" && (
          <button
            className={`${styles.btnRowSm} ${styles.btnRowDanger}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// InfoModal
function InfoModal({ meeting, onClose }) {
  const start = new Date(meeting.scheduledAt);
  const [copied, setCopied] = useState(false);
  const fmt = (d) =>
    d.toLocaleString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const copyCode = () => {
    navigator.clipboard.writeText(meeting.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={styles.infoOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`${styles.infoModal} anim-scale-in`}>
        <div className={styles.infoHeader}>
          <div>
            <h2 className={styles.infoTitle}>{meeting.title}</h2>
            <span className={styles.infoStatus}>
              {meeting.status || "UPCOMING"}
            </span>
          </div>
          <button className={styles.infoClose} onClick={onClose}>
            <CloseIco />
          </button>
        </div>
        <div className={styles.infoBody}>
          <InfoRow icon={<CalIco />} label="When">
            {fmt(start)} · {meeting.durationMinutes} min
          </InfoRow>
          <InfoRow icon={<KeyIco />} label="Room code">
            <div className={styles.infoCodeRow}>
              <span className={styles.infoCode}>{meeting.roomCode}</span>
              <button className={styles.copyBtn} onClick={copyCode}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </InfoRow>
          <InfoRow icon={<UserIco />} label="Host">
            {meeting.hostName || meeting.hostEmail}
          </InfoRow>
          {meeting.description && (
            <InfoRow icon={<NoteIco />} label="Description">
              {meeting.description}
            </InfoRow>
          )}
          <InfoRow
            icon={<MailIco />}
            label={`Invitees${meeting.invitees?.length ? ` (${meeting.invitees.length})` : ""}`}
          >
            {meeting.invitees?.length > 0 ? (
              <div className={styles.infoPills}>
                {meeting.invitees.map((e) => (
                  <span key={e} className={styles.infoPill}>
                    {e}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.infoMuted}>No invitees added</span>
            )}
          </InfoRow>
        </div>
        <div className={styles.infoFooter}>
          <button
            className={`btn btn-ghost ${styles.infoCloseBtn}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoRowIcon}>{icon}</span>
      <div className={styles.infoRowContent}>
        <p className={styles.infoRowLabel}>{label}</p>
        <div className={styles.infoRowVal}>{children}</div>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────── */
const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const VideoIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
    <rect x="3" y="8" width="12" height="8" rx="2" />
  </svg>
);

const PlayIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const CalIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const LinkIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ArrowIco = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
);

const ChartIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ClockIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const InfoIco = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CloseIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SunIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const LogoutIco = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const WarnIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const KeyIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const UserIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const NoteIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

const MailIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
