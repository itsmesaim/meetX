const BASE = '/api'

async function request(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const body = await res.json()

  if (!res.ok || !body.success) {
    throw new Error(body.message || `Request failed: ${res.status}`)
  }
  return body.data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // ── Rooms ────────────────────────────────────────────────────────────────
  createRoom: (token) =>
    request('/rooms/create', { method: 'POST' }, token),

  joinRoom: (roomCode, token) =>
    request('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    }, token),

  getLiveKitToken: (roomCode, participantName, token) =>
    request(
      `/rooms/${roomCode}/token?participantName=${encodeURIComponent(participantName)}`,
      { method: 'GET' },
      token
    ),

  closeRoom: (roomCode, token) =>
    request(`/rooms/${roomCode}`, { method: 'DELETE' }, token),

  // ── Chat history ──────────────────────────────────────────────────────────
  getChatHistory: (roomCode, token) =>
    request(`/chat/${roomCode}/history`, { method: 'GET' }, token),
}
