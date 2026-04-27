import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <LogoMark />
        <span className={styles.logoText}>MeetX</span>
      </div>

      <div className={styles.right}>
        {/* Theme toggle */}
        <button
          className={styles.themeBtn}
          onClick={toggle}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        {user && (
          <div className={styles.userChip}>
            <div className={styles.avatar}>
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
        )}

        <button
          className={`btn btn-ghost ${styles.signOut}`}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  );
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
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
  );
}
function SunIcon() {
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
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIcon() {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      width="15"
      height="15"
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
  );
}
