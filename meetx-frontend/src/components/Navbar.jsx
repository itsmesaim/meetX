import { useAuth } from '../contexts/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="9" fill="var(--teal)" fillOpacity="0.15"/>
          <path d="M8 12a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8Z" stroke="var(--teal)" strokeWidth="1.5"/>
          <path d="M20 14l4-2v8l-4-2" stroke="var(--teal)" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        <span className={styles.logoText}>MeetX</span>
      </div>

      <div className={styles.right}>
        {user && (
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
        )}
        <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={handleLogout}>
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
