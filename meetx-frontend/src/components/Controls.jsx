import { useState, useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import styles from "./Controls.module.css";

export default function Controls({ onLeave, onInvite }) {
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [screen, setScreen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const hh = Math.floor(seconds / 3600);
  const timer =
    hh > 0 ? `${String(hh).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;

  const toggleMic = async () => {
    if (!localParticipant) return;
    const next = !mic;
    await localParticipant.setMicrophoneEnabled(next);
    setMic(next);
  };
  const toggleCam = async () => {
    if (!localParticipant) return;
    const next = !cam;
    await localParticipant.setCameraEnabled(next);
    setCam(next);
  };
  const toggleScreen = async () => {
    if (!localParticipant) return;
    try {
      const next = !screen;
      await localParticipant.setScreenShareEnabled(next);
      setScreen(next);
    } catch {}
  };

  return (
    <div className={styles.bar}>
      {/* Timer */}
      <div className={styles.timer}>
        <span className={styles.timerDot} />
        <span className={styles.timerVal}>{timer}</span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <CtrlBtn
          on={mic}
          danger={!mic}
          onClick={toggleMic}
          label={mic ? "Mute" : "Unmute"}
        >
          {mic ? <MicIcon /> : <MicOffIcon />}
        </CtrlBtn>
        <CtrlBtn
          on={cam}
          danger={!cam}
          onClick={toggleCam}
          label={cam ? "Camera" : "No cam"}
        >
          {cam ? <CamIcon /> : <CamOffIcon />}
        </CtrlBtn>
        <CtrlBtn
          on={screen}
          onClick={toggleScreen}
          label={screen ? "Sharing" : "Share"}
          accent={screen}
        >
          <ScreenIcon />
        </CtrlBtn>
        <CtrlBtn onClick={onInvite} label="Invite">
          <InviteIcon />
        </CtrlBtn>
        <button className={styles.leaveBtn} onClick={onLeave}>
          <PhoneOffIcon />
          <span>Leave</span>
        </button>
      </div>

      {/* Spacer */}
      <div className={styles.spacer} />
    </div>
  );
}

function CtrlBtn({ children, on, danger, accent, onClick, label, disabled }) {
  return (
    <button
      className={`${styles.ctrl}
        ${on && !danger ? styles.ctrlOn : ""}
        ${danger ? styles.ctrlDanger : ""}
        ${accent ? styles.ctrlAccent : ""}
        ${disabled ? styles.ctrlDisabled : ""}
      `}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <span className={styles.ctrlIcon}>{children}</span>
      <span className={styles.ctrlLabel}>{label}</span>
    </button>
  );
}

function MicIcon() {
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
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function MicOffIcon() {
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
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function CamIcon() {
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
      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" />
      <rect x="3" y="8" width="12" height="8" rx="2" />
    </svg>
  );
}
function CamOffIcon() {
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
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
      <path d="M15 13a3 3 0 1 1-4.24-2.76" />
    </svg>
  );
}
function ScreenIcon() {
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
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function InviteIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function PhoneOffIcon() {
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
