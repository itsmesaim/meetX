import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import styles from "./AuthPage.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      login(data.token, { email: data.email, name: data.name });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background aurora blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={`${styles.card} anim-fade-up`}>
        {/* Logo */}
        <div className={styles.logo}>
          <LogoIcon />
          <span>MeetX</span>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your account to continue</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className="input-field"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className="input-field"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "Sign in"}
          </button>
        </form>

        <p className={styles.switch}>
          Don't have an account?{" "}
          <Link to="/register" className={styles.switchLink}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect
        width="32"
        height="32"
        rx="10"
        fill="var(--teal)"
        fillOpacity="0.15"
      />
      <path
        d="M8 12a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8Z"
        stroke="var(--teal)"
        strokeWidth="1.5"
      />
      <path
        d="M20 14l4-2v8l-4-2"
        stroke="var(--teal)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
