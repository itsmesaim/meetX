import { useState } from "react";
import { api } from "../services/api.js";
import styles from "./ScheduleModal.module.css";

export default function ScheduleModal({ token, onClose, onScheduled }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    durationMinutes: 60,
    invitees: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Meeting title is required");
      return;
    }
    if (!form.scheduledAt) {
      setError("Please pick a date and time");
      return;
    }
    if (new Date(form.scheduledAt) <= new Date()) {
      setError("Scheduled time must be in the future");
      return;
    }

    // Parse comma/newline-separated emails
    const invitees = form.invitees
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));

    setLoading(true);
    try {
      const meeting = await api.scheduleMeeting(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          scheduledAt: form.scheduledAt,
          durationMinutes: Number(form.durationMinutes),
          invitees,
        },
        token,
      );

      onScheduled(meeting);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Minimum datetime = now + 5 min (for the datetime-local input)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`${styles.modal} anim-fade-up`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <CalendarIcon />
            <h2 className={styles.title}>Schedule a meeting</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <CloseIcon />
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>Meeting title *</label>
            <input
              className="input-field"
              type="text"
              name="title"
              placeholder="e.g. Team standup, Project review..."
              value={form.title}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description (optional)</label>
            <textarea
              className={`input-field ${styles.textarea}`}
              name="description"
              placeholder="What's this meeting about?"
              value={form.description}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {/* Date + Duration */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Date & time *</label>
              <input
                className="input-field"
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
                min={minDateTime}
                required
              />
            </div>
            <div className={styles.field} style={{ maxWidth: 140 }}>
              <label className={styles.label}>Duration</label>
              <select
                className="input-field"
                name="durationMinutes"
                value={form.durationMinutes}
                onChange={handleChange}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Invitees */}
          <div className={styles.field}>
            <label className={styles.label}>
              Invite people{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                (optional — emails, comma separated)
              </span>
            </label>
            <textarea
              className={`input-field ${styles.textarea}`}
              name="invitees"
              placeholder="friend@example.com, colleague@work.com"
              value={form.invitees}
              onChange={handleChange}
              rows={2}
            />
            <p className={styles.hint}>
              Each person will receive an email with the room code and a join
              link.
            </p>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <CalendarIcon /> Schedule & send invites
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
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
function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
