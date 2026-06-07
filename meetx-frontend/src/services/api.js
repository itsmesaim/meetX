const BASE = "/api";

async function request(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  // auto-read from localStorage if token not passed
  const authToken = token || localStorage.getItem("meetx_token");
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // 401 anywhere = session dead = auto logout + redirect
  if (res.status === 401) {
    // localStorage.clear();
    localStorage.removeItem("meetx_token");
    localStorage.removeItem("meetx_user");
    window.location.href = "/login";
    return Promise.reject(new Error("Session expired. Please login again."));
  }

  const text = await res.text();
  if (!text) throw new Error("Server returned empty response");

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!res.ok || !body.success) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return body.data;
}

export const api = {
  // Auth
  register: (name, email, password) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Rooms
  createRoom: (token) => request("/rooms/create", { method: "POST" }, token),

  joinRoom: (roomCode, token) =>
    request(
      "/rooms/join",
      {
        method: "POST",
        body: JSON.stringify({ roomCode }),
      },
      token,
    ),

  getLiveKitToken: (roomCode, participantName, token) =>
    request(
      `/rooms/${roomCode}/token?participantName=${encodeURIComponent(participantName)}`,
      { method: "GET" },
      token,
    ),

  closeRoom: (roomCode, token) =>
    request(`/rooms/${roomCode}`, { method: "DELETE" }, token),

  // Session tracking
  // Call these when a participant joins/leaves the LiveKit room
  notifyJoin: (roomCode, token) =>
    request(`/rooms/${roomCode}/session/join`, { method: "POST" }, token),

  notifyLeave: (roomCode, token) =>
    request(`/rooms/${roomCode}/session/leave`, { method: "POST" }, token),

  // Chat
  getChatHistory: (roomCode, token) =>
    request(`/chat/${roomCode}/history`, { method: "GET" }, token),

  // Scheduled meetings
  scheduleMeeting: (data, token) =>
    request(
      "/meetings/schedule",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
    ),

  getMyMeetings: (token) => request("/meetings/my", { method: "GET" }, token),

  cancelMeeting: (id, token) =>
    request(`/meetings/${id}`, { method: "DELETE" }, token),

  updateMeeting: (id, data, token) =>
    request(
      `/meetings/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
    ),

  startMeetingNow: (id, token) =>
    request(`/meetings/${id}/start`, { method: "POST" }, token),

  // Admit or deny a user (host calls this)
  admitUser: (code, email, admitted, token) =>
    request(
      `/rooms/${code}/admit`,
      { method: "POST", body: JSON.stringify({ email, admitted }) },
      token,
    ),

  // Check if admitted (guest polls this)
  checkAdmission: (code, email, token) =>
    request(
      `/rooms/${code}/admission-status?email=${encodeURIComponent(email)}`,
      { method: "GET" },
      token,
    ),
};
