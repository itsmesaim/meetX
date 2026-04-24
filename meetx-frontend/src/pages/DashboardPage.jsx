import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import ScheduleModal from "../components/ScheduleModal.jsx";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { token, user } = useAuth();
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
      .then((data) => {
        setMeetings(
          data.filter(
            (m) =>
              m.hostEmail === user?.email ||
              (m.invitees && m.invitees.includes(user?.email)),
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, [token]);

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      const room = await api.createRoom(token);
      navigate(`/room/${room.roomCode}`);
    } catch (err) {
      setError(err.message);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleScheduled = (newMeeting) => {
    setMeetings((prev) =>
      [newMeeting, ...prev].sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt),
      ),
    );
    setShowSchedule(false);
  };

  const handleUpdated = (updated) => {
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setEditingMeeting(null);
  };

  const handleCancelMeeting = async (id) => {
    try {
      await api.cancelMeeting(id, token);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartNow = async (id, roomCode) => {
    try {
      await api.startMeetingNow(id, token);
      navigate(`/room/${roomCode}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

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
            Video meetings,
            <br />
            <span className={styles.heroAccent}>zero friction.</span>
          </h1>
          <p className={styles.heroSub}>
            One click to create a room. Share the code. Start talking.
          </p>
        </section>

        {/* Action cards */}
        <section className={styles.cards}>
          {/* Create */}
          <div
            className={`${styles.card} ${styles.cardCreate} anim-fade-up anim-delay-1`}
          >
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
              {creating ? (
                <span className="spinner" />
              ) : (
                <>
                  <PlusIcon /> Start a meeting
                </>
              )}
            </button>
            <button
              className={`btn btn-ghost ${styles.scheduleBtn}`}
              onClick={() => setShowSchedule(true)}
            >
              <CalendarIcon /> Schedule for later
            </button>
          </div>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Join */}
          <div
            className={`${styles.card} ${styles.cardJoin} anim-fade-up anim-delay-2`}
          >
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
          <div className={`${styles.errorBanner} anim-fade-up`}>
            <WarnIcon /> {error}
          </div>
        )}

        {/* Upcoming meetings */}
        {(loadingMeetings || meetings.length > 0) && (
          <section className={`${styles.upcoming} anim-fade-up anim-delay-3`}>
            <h2 className={styles.upcomingTitle}>
              <CalendarIcon /> Upcoming meetings
            </h2>
            {loadingMeetings ? (
              <div className={styles.upcomingLoading}>
                <span className="spinner spinner-light" />
              </div>
            ) : (
              <div className={styles.meetingList}>
                {meetings.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    userEmail={user?.email}
                    onJoin={() => navigate(`/room/${m.roomCode}`)}
                    onCancel={() => handleCancelMeeting(m.id)}
                    onEdit={() => setEditingMeeting(m)}
                    onStartNow={() => handleStartNow(m.id, m.roomCode)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Features strip */}
        <section className={`${styles.features} anim-fade-up anim-delay-4`}>
          {FEATURES.map((f) => (
            <div key={f.label} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span className={styles.featureLabel}>{f.label}</span>
            </div>
          ))}
        </section>
      </main>

      {/* Schedule Modal */}
      {showSchedule && (
        <ScheduleModal
          token={token}
          onClose={() => setShowSchedule(false)}
          onScheduled={handleScheduled}
        />
      )}

      {/* Edit Modal */}
      {editingMeeting && (
        <ScheduleModal
          key={editingMeeting.id + JSON.stringify(editingMeeting.invitees)}
          token={token}
          editMode={true}
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onScheduled={handleUpdated}
        />
      )}
    </div>
  );
}

/* ── Meeting card ─────────────────────────────────────────────── */
function MeetingCard({
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
    <div className={`${styles.meetingCard} ${isNow ? styles.meetingNow : ""}`}>
      <div className={styles.meetingLeft}>
        <div className={styles.meetingMeta}>
          {isNow && <span className={styles.livePill}>● Live now</span>}
          <span className={styles.meetingTime}>{fmt(start)}</span>
          <span className={styles.meetingDuration}>
            · {meeting.durationMinutes} min
          </span>
        </div>
        <h3 className={styles.meetingTitle}>{meeting.title}</h3>
        {meeting.description && (
          <p className={styles.meetingDesc}>{meeting.description}</p>
        )}
        <div className={styles.meetingFooter}>
          <span className={styles.meetingCode}>{meeting.roomCode}</span>
          {meeting.invitees?.length > 0 && (
            <span className={styles.meetingInvitees}>
              {meeting.invitees.length} invitee
              {meeting.invitees.length !== 1 ? "s" : ""}
            </span>
          )}
          {isHost && <span className={styles.hostBadge}>Host</span>}
        </div>
      </div>

      <div className={styles.meetingActions}>
        {/* Start now — host, upcoming only */}
        {isHost && meeting.status === "UPCOMING" && (
          <button
            className="btn btn-primary"
            onClick={onStartNow}
            style={{ height: 38, fontSize: "0.82rem" }}
          >
            ▶ Start now
          </button>
        )}

        {/* Join — active meetings */}
        {(isNow || meeting.status === "ACTIVE") && (
          <button
            className="btn btn-primary"
            onClick={onJoin}
            style={{ height: 38, fontSize: "0.82rem" }}
          >
            Join now
          </button>
        )}

        {/* Edit — host, upcoming only */}
        {isHost && meeting.status === "UPCOMING" && (
          <button
            className="btn btn-ghost"
            onClick={onEdit}
            style={{ height: 38, fontSize: "0.82rem" }}
          >
            ✏ Edit
          </button>
        )}

        {/* Cancel — host only */}
        {isHost && meeting.status !== "ENDED" && (
          <button
            className="btn btn-danger"
            onClick={onCancel}
            style={{ height: 38, fontSize: "0.82rem" }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "🔒", label: "End-to-end encrypted" },
  { icon: "⚡", label: "Ultra-low latency" },
  { icon: "💬", label: "Real-time chat" },
  { icon: "📅", label: "Schedule meetings" },
];

/* ── Icons ───────────────────────────────────────────────────── */
function VideoIcon() {
  return (
    <svg
      width="24"
      height="24"
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
  );
}
function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg
      width="24"
      height="24"
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
  );
}
function WarnIcon() {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
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
  );
}
