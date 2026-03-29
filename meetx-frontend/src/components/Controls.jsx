import { useState, useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import styles from "./Controls.module.css";

export default function Controls({ onLeave }) {
  const { localParticipant } = useLocalParticipant();

  // Start both OFF — user must click to enable
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const next = !micEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const toggleCam = async () => {
    if (!localParticipant) return;
    const next = !camEnabled;
    await localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  };

  const toggleScreen = async () => {
    if (!localParticipant) return;
    try {
      const next = !screenEnabled;
      await localParticipant.setScreenShareEnabled(next);
      setScreenEnabled(next);
    } catch (err) {
      console.warn("Screen share cancelled:", err.message);
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.side} />

      <div className={styles.centre}>
        {/* Mic */}
        <ControlButton
          on={micEnabled}
          onClick={toggleMic}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
          offClass={styles.ctrlOff}
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
          <span className={styles.label}>{micEnabled ? "Mute" : "Unmute"}</span>
        </ControlButton>

        {/* Camera */}
        <ControlButton
          on={camEnabled}
          onClick={toggleCam}
          title={camEnabled ? "Turn off camera" : "Turn on camera"}
          offClass={styles.ctrlOff}
        >
          {camEnabled ? <CamIcon /> : <CamOffIcon />}
          <span className={styles.label}>
            {camEnabled ? "Camera" : "No cam"}
          </span>
        </ControlButton>

        {/* Leave */}
        <button
          className={`${styles.ctrlBtn} ${styles.leaveBtn}`}
          onClick={onLeave}
          title="Leave meeting"
        >
          <PhoneOffIcon />
          <span className={styles.label}>Leave</span>
        </button>

        {/* Screen share */}
        <ControlButton
          on={screenEnabled}
          onClick={toggleScreen}
          title={screenEnabled ? "Stop sharing" : "Share screen"}
          onClass={styles.ctrlShareOn}
        >
          <ScreenIcon />
          <span className={styles.label}>
            {screenEnabled ? "Sharing" : "Share"}
          </span>
        </ControlButton>

        {/* More — placeholder */}
        <ControlButton
          on={false}
          onClick={() => {}}
          title="More options"
          disabled
        >
          <MoreIcon />
          <span className={styles.label}>More</span>
        </ControlButton>
      </div>

      <div className={styles.side}>
        <MeetingTimer />
      </div>
    </div>
  );
}

function ControlButton({
  children,
  on,
  onClick,
  title,
  offClass,
  onClass,
  disabled,
}) {
  return (
    <button
      className={`
        ${styles.ctrlBtn}
        ${on ? onClass || styles.ctrlOn : offClass || ""}
        ${disabled ? styles.ctrlDisabled : ""}
      `}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function MeetingTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className={styles.timer}>
      <span className={styles.timerDot} />
      <span className={styles.timerValue}>
        {seconds >= 3600 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
      </span>
    </div>
  );
}

function MicIcon() {
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
function MicOffIcon() {
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
function CamIcon() {
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
function CamOffIcon() {
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
function ScreenIcon() {
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
function MoreIcon() {
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
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
