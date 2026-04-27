import { useState, useEffect, useRef } from "react";
import styles from "./DateTimePicker.module.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINS = ["00", "15", "30", "45"];

export default function DateTimePicker({ value, onChange, min }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("cal"); // 'cal' | 'time'

  const now = new Date();
  const minD = min ? new Date(min) : new Date(now.getTime() + 5 * 60 * 1000);

  const parsed = value ? new Date(value) : null;
  const [sel, setSel] = useState({
    year: parsed ? parsed.getFullYear() : now.getFullYear(),
    month: parsed ? parsed.getMonth() : now.getMonth(),
    day: parsed ? parsed.getDate() : null,
    hour: parsed ? parsed.getHours() % 12 || 12 : 12,
    min: parsed ? Math.round(parsed.getMinutes() / 15) * 15 : 0,
    ampm: parsed ? (parsed.getHours() < 12 ? "AM" : "PM") : "PM",
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const emit = (s) => {
    if (!s.day) return;
    const h24 =
      s.ampm === "AM"
        ? s.hour === 12
          ? 0
          : s.hour
        : s.hour === 12
          ? 12
          : s.hour + 12;
    const d = new Date(s.year, s.month, s.day, h24, s.min);
    onChange(d.toISOString().slice(0, 16));
  };

  const update = (patch) => {
    const next = { ...sel, ...patch };
    setSel(next);
    emit(next);
  };

  // Calendar grid
  const firstDay = new Date(sel.year, sel.month, 1).getDay();
  const daysInMonth = new Date(sel.year, sel.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isPast = (d) => {
    const dt = new Date(sel.year, sel.month, d);
    return dt < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate());
  };

  const displayVal = parsed
    ? parsed.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Pick a date & time";

  const prevMonth = () => {
    if (sel.month === 0) update({ month: 11, year: sel.year - 1 });
    else update({ month: sel.month - 1 });
  };
  const nextMonth = () => {
    if (sel.month === 11) update({ month: 0, year: sel.year + 1 });
    else update({ month: sel.month + 1 });
  };

  return (
    <div className={styles.wrap} ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <CalIcon />
        <span
          className={`${styles.triggerText} ${!parsed ? styles.triggerPlaceholder : ""}`}
        >
          {displayVal}
        </span>
        <ChevronIcon />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`${styles.dropdown} anim-scale-in`}>
          {/* Tab row */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${view === "cal" ? styles.tabActive : ""}`}
              onClick={() => setView("cal")}
            >
              <CalIcon /> Date
            </button>
            <button
              type="button"
              className={`${styles.tab} ${view === "time" ? styles.tabActive : ""}`}
              onClick={() => setView("time")}
              disabled={!sel.day}
            >
              <ClockIcon /> Time
            </button>
          </div>

          {/* Calendar view */}
          {view === "cal" && (
            <div className={styles.cal}>
              {/* Month nav */}
              <div className={styles.calNav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={prevMonth}
                >
                  ‹
                </button>
                <span className={styles.calMonth}>
                  {MONTHS[sel.month]} {sel.year}
                </span>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={nextMonth}
                >
                  ›
                </button>
              </div>

              {/* Day headers */}
              <div className={styles.dayHeaders}>
                {DAYS.map((d) => (
                  <span key={d} className={styles.dayHead}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className={styles.grid}>
                {cells.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.cell}
                      ${d === null ? styles.cellEmpty : ""}
                      ${d && isPast(d) ? styles.cellPast : ""}
                      ${d === sel.day ? styles.cellSel : ""}
                    `}
                    onClick={() => {
                      if (!d || isPast(d)) return;
                      const next = { ...sel, day: d };
                      setSel(next);
                      emit(next);
                      setView("time");
                    }}
                    disabled={!d || isPast(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time view */}
          {view === "time" && (
            <div className={styles.timePick}>
              <p className={styles.timeTitle}>
                {sel.day
                  ? `${MONTHS[sel.month]} ${sel.day}, ${sel.year}`
                  : "Pick a date first"}
              </p>

              <div className={styles.timeRow}>
                {/* Hour */}
                <div className={styles.timeCol}>
                  <span className={styles.timeLabel}>Hour</span>
                  <div className={styles.timeScroll}>
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`${styles.timeBtn} ${Number(h) === sel.hour ? styles.timeBtnSel : ""}`}
                        onClick={() => update({ hour: Number(h) })}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <span className={styles.timeSep}>:</span>

                {/* Minute */}
                <div className={styles.timeCol}>
                  <span className={styles.timeLabel}>Min</span>
                  <div className={styles.timeScroll}>
                    {MINS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`${styles.timeBtn} ${Number(m) === sel.min ? styles.timeBtnSel : ""}`}
                        onClick={() => update({ min: Number(m) })}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM/PM */}
                <div className={styles.timeCol}>
                  <span className={styles.timeLabel}>AM/PM</span>
                  <div className={styles.ampmCol}>
                    {["AM", "PM"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.ampmBtn} ${sel.ampm === p ? styles.ampmSel : ""}`}
                        onClick={() => update({ ampm: p })}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`btn btn-primary ${styles.doneBtn}`}
                onClick={() => setOpen(false)}
              >
                ✓ Confirm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CalIcon() {
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
function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
