import { useState } from "react";
import { api } from "../services/api.js";
import styles from "./ScheduleModal.module.css";
// import DateTimePicker from '../components/DateTimePicker.jsx'

export default function ScheduleModal({
  token,
  onClose,
  onScheduled,
  editMode = false,
  meeting = null,
}) {
  const [form, setForm] = useState({
    title: editMode && meeting ? meeting.title : "",
    description: editMode && meeting ? meeting.description : "",
    scheduledAt: editMode && meeting ? meeting.scheduledAt?.slice(0, 16) : "",
    durationMinutes: editMode && meeting ? meeting.durationMinutes : 60,
    invitees: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [currentInvitees, setCurrent] = useState(
    editMode && meeting ? [...(meeting.invitees || [])] : [],
  );

  const hc = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const min = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Title required");
      return;
    }
    if (!editMode && !form.scheduledAt) {
      setError("Pick a date & time");
      return;
    }
    if (!editMode && new Date(form.scheduledAt) <= new Date()) {
      setError("Must be in the future");
      return;
    }
    const newInv = form.invitees
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    setLoading(true);
    try {
      let result;
      if (editMode) {
        result = await api.updateMeeting(
          meeting.id,
          {
            title: form.title.trim(),
            description: form.description.trim(),
            scheduledAt: form.scheduledAt || meeting.scheduledAt,
            durationMinutes: Number(form.durationMinutes),
            invitees: currentInvitees,
            newInvitees: newInv,
          },
          token,
        );
      } else {
        result = await api.scheduleMeeting(
          {
            title: form.title.trim(),
            description: form.description.trim(),
            scheduledAt: form.scheduledAt,
            durationMinutes: Number(form.durationMinutes),
            invitees: newInv,
          },
          token,
        );
      }
      onScheduled(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`${styles.modal} anim-scale-in`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.hIcon}>
              <CalIco />
            </div>
            <div>
              <h2 className={styles.title}>
                {editMode ? "Edit meeting" : "Schedule a meeting"}
              </h2>
              {!editMode && <p className={styles.stepTxt}>Step {step} of 2</p>}
            </div>
          </div>
          <button className={styles.xBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {!editMode && (
          <div className={styles.progress}>
            <div
              className={styles.progressFill}
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        )}

        {error && <div className={styles.err}>{error}</div>}

        <form onSubmit={submit} className={styles.form}>
          {(step === 1 || editMode) && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Meeting title *</label>
                <input
                  className="input-field"
                  type="text"
                  name="title"
                  placeholder="e.g. Team standup, Interview…"
                  value={form.title}
                  onChange={hc}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Description <span className={styles.opt}>(optional)</span>
                </label>
                <textarea
                  className={`input-field ${styles.ta}`}
                  name="description"
                  placeholder="What's this meeting about?"
                  value={form.description}
                  onChange={hc}
                  rows={2}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Date & time {!editMode && "*"}
                  </label>
                  <input
                    className="input-field"
                    type="datetime-local"
                    name="scheduledAt"
                    value={form.scheduledAt}
                    onChange={hc}
                    min={min}
                    required={!editMode}
                  />
                </div>
                <div className={styles.field} style={{ maxWidth: 140 }}>
                  <label className={styles.label}>Duration</label>
                  <select
                    className="input-field"
                    name="durationMinutes"
                    value={form.durationMinutes}
                    onChange={hc}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hrs</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
              {editMode && currentInvitees.length > 0 && (
                <div className={styles.field}>
                  <label className={styles.label}>Current invitees</label>
                  <div className={styles.pills}>
                    {currentInvitees.map((e) => (
                      <span key={e} className={styles.pill}>
                        {e}
                        <button
                          type="button"
                          className={styles.pillX}
                          onClick={() =>
                            setCurrent((p) => p.filter((x) => x !== e))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {editMode && (
                <div className={styles.field}>
                  <label className={styles.label}>Add more people</label>
                  <textarea
                    className={`input-field ${styles.ta}`}
                    name="invitees"
                    placeholder="email@example.com, another@example.com"
                    value={form.invitees}
                    onChange={hc}
                    rows={2}
                  />
                </div>
              )}
            </>
          )}

          {step === 2 && !editMode && (
            <>
              <div className={styles.preview}>
                <div className={styles.previewIcon}>
                  <CalIco />
                </div>
                <div>
                  <p className={styles.previewTitle}>{form.title}</p>
                  <p className={styles.previewTime}>
                    {form.scheduledAt
                      ? new Date(form.scheduledAt).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}{" "}
                    · {form.durationMinutes} min
                  </p>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Invite people <span className={styles.opt}>(optional)</span>
                </label>
                <textarea
                  className={`input-field ${styles.ta}`}
                  name="invitees"
                  placeholder="friend@example.com, colleague@work.com"
                  value={form.invitees}
                  onChange={hc}
                  rows={3}
                  autoFocus
                />
                <p className={styles.hint}>
                  Each person will receive an email with the room code and join
                  link
                </p>
              </div>
            </>
          )}

          <div className={styles.actions}>
            {!editMode && step === 2 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
            )}
            {(editMode || step === 1) && (
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
            )}

            {!editMode && step === 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!form.title.trim()) {
                    setError("Title required");
                    return;
                  }
                  if (!form.scheduledAt) {
                    setError("Pick a time");
                    return;
                  }
                  if (new Date(form.scheduledAt) <= new Date()) {
                    setError("Must be in future");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : editMode ? (
                  "Save changes"
                ) : (
                  "Schedule meeting"
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function CalIco() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
