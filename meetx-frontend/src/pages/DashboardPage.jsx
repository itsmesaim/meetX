import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import ScheduleModal from "../components/ScheduleModal.jsx";
import styles from "./DashboardPage.module.css";

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
      navigate(`/room/${r.roomCode}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError("");
    setJoining(true);
    try {
      await api.joinRoom(joinCode.trim().toUpperCase(), token);
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
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
      navigate(`/room/${roomCode}`);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className={styles.page}>
      {/* Animated background */}
      <div className={styles.bg} aria-hidden>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.grid} />
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
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
          <span className={styles.navBrand}>MeetX</span>
        </div>
        <div className={styles.navRight}>
          <button
            className={styles.themeBtn}
            onClick={toggle}
            title="Toggle theme"
          >
            {theme === "dark" ? (
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
            ) : (
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
            )}
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        {/* Hero */}
        <section className={`${styles.hero} anim-fade-up`}>
          <div className={styles.liveChip}>
            <span className={styles.liveDot} />
            Ready to connect
          </div>
          <h1 className={styles.heroTitle}>
            Video calls,
            <br />
            <span className={styles.heroGrad}>reimagined.</span>
          </h1>
          <p className={styles.heroSub}>
            Create a room in one click. Share the code. Start talking.
          </p>
        </section>

        {/* Action cards */}
        <section className={`${styles.cards} anim-fade-up anim-delay-1`}>
          {/* Create */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={`${styles.cardIcon} ${styles.iconTeal}`}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
                  <rect x="3" y="8" width="12" height="8" rx="2" />
                </svg>
              </div>
              <div>
                <h2 className={styles.cardTitle}>New meeting</h2>
                <p className={styles.cardSub}>
                  Start instantly, share the code
                </p>
              </div>
            </div>
            <button
              className={`btn btn-primary ${styles.cardBtn}`}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <span className="spinner" /> : "Start a meeting"}
            </button>
            <button
              className={`btn btn-ghost ${styles.schedBtn}`}
              onClick={() => setShowSchedule(true)}
            >
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
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Schedule for later
            </button>
          </div>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Join */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={`${styles.cardIcon} ${styles.iconViolet}`}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <h2 className={styles.cardTitle}>Join a meeting</h2>
                <p className={styles.cardSub}>Enter a room code to join</p>
              </div>
            </div>
            <form onSubmit={handleJoin}>
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
                style={{ marginTop: 10 }}
              >
                {joining ? (
                  <span className="spinner spinner-light" />
                ) : (
                  "Join room"
                )}
              </button>
            </form>
          </div>
        </section>

        {error && (
          <div className={`${styles.errBanner} anim-fade-up`}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {error}
          </div>
        )}

        {/* Upcoming meetings */}
        {(loadingMeetings || meetings.length > 0) && (
          <section className={`${styles.upcoming} anim-fade-up anim-delay-2`}>
            <div className={styles.upcomingHead}>
              <h2 className={styles.upcomingTitle}>Upcoming meetings</h2>
              <span className={styles.upcomingCount}>{meetings.length}</span>
            </div>
            {loadingMeetings ? (
              <div className={styles.upcomingLoad}>
                <span className="spinner spinner-light" />
              </div>
            ) : (
              <div className={styles.meetList}>
                {meetings.map((m) => (
                  <MeetCard
                    key={m.id}
                    meeting={m}
                    userEmail={user?.email}
                    onJoin={() => navigate(`/room/${m.roomCode}`)}
                    onCancel={() => handleCancel(m.id)}
                    onEdit={() => setEditingMeeting(m)}
                    onStartNow={() => handleStartNow(m.id, m.roomCode)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Footer strip */}
        <div className={`${styles.strip} anim-fade-up anim-delay-3`}>
          {[
            "End-to-end encrypted",
            "Ultra-low latency",
            "Real-time chat",
            "Schedule meetings",
          ].map((f) => (
            <span key={f} className={styles.stripItem}>
              {f}
            </span>
          ))}
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
    </div>
  );
}

function MeetCard({
  meeting,
  userEmail,
  onJoin,
  onCancel,
  onEdit,
  onStartNow,
}) {
  const isHost = meeting.hostEmail === userEmail;
  const start = new Date(meeting.scheduledAt);
  const now = new Date();
  const isNow = Math.abs(now - start) < 15 * 60 * 1000;
  const fmt = (d) =>
    d.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className={`${styles.meetCard} ${isNow ? styles.meetCardLive : ""}`}>
      <div className={styles.meetLeft}>
        <div className={styles.meetTime}>
          {isNow && <span className={styles.livePill}>LIVE</span>}
          <span>{fmt(start)}</span>
          <span className={styles.meetDur}>
            · {meeting.durationMinutes} min
          </span>
        </div>
        <h3 className={styles.meetTitle}>{meeting.title}</h3>
        {meeting.description && (
          <p className={styles.meetDesc}>{meeting.description}</p>
        )}
        <div className={styles.meetMeta}>
          <span className={styles.meetCode}>{meeting.roomCode}</span>
          {meeting.invitees?.length > 0 && (
            <span className={styles.meetInv}>
              {meeting.invitees.length} invited
            </span>
          )}
          {isHost && <span className={styles.hostTag}>Host</span>}
        </div>
      </div>
      <div className={styles.meetActions}>
        {isHost && meeting.status === "UPCOMING" && (
          <button
            className="btn btn-primary"
            onClick={onStartNow}
            style={{ height: 36, fontSize: "0.8rem", padding: "0 14px" }}
          >
            Start now
          </button>
        )}
        {(isNow || meeting.status === "ACTIVE") && (
          <button
            className="btn btn-primary"
            onClick={onJoin}
            style={{ height: 36, fontSize: "0.8rem", padding: "0 14px" }}
          >
            Join
          </button>
        )}
        {isHost && meeting.status === "UPCOMING" && (
          <button
            className="btn btn-ghost"
            onClick={onEdit}
            style={{ height: 36, fontSize: "0.8rem", padding: "0 14px" }}
          >
            Edit
          </button>
        )}
        {isHost && meeting.status !== "ENDED" && (
          <button
            className="btn btn-danger"
            onClick={onCancel}
            style={{ height: 36, fontSize: "0.8rem", padding: "0 14px" }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
