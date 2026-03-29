# MeetX Frontend

React 18 + Vite frontend for the MeetX video calling app.

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Video | LiveKit Components React |
| Chat | STOMP over SockJS (`@stomp/stompjs`) |
| Styles | CSS Modules + global design tokens |
| Auth | JWT stored in localStorage |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your LiveKit server URL
#    Edit .env → VITE_LIVEKIT_URL=wss://your-project.livekit.cloud

# 3. Make sure the Spring Boot backend is running on :8080

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_LIVEKIT_URL` | WebSocket URL of your LiveKit server |

## Project Structure

```
src/
├── App.jsx                  # Router + PrivateRoute guard
├── main.jsx                 # Entry point
├── index.css                # Global tokens, resets, animations
├── contexts/
│   └── AuthContext.jsx      # JWT auth state (login/logout)
├── services/
│   └── api.js               # All HTTP calls to Spring Boot
├── hooks/
│   └── useChat.js           # STOMP WebSocket chat hook
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx    # Create / join room
│   └── RoomPage.jsx         # LiveKit room + chat sidebar
└── components/
    ├── Navbar.jsx
    ├── ChatPanel.jsx        # Grouped message bubbles + textarea
    └── Controls.jsx         # Mic / cam / screenshare / leave + timer
```

## Production Build

```bash
npm run build
# Output in dist/ — serve with any static host (Nginx, Vercel, Netlify, etc.)
```

### Nginx example (serving alongside the Spring Boot API)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    root /var/www/meetx/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }

    # Backend proxy
    location /api/ { proxy_pass http://localhost:8080; }
    location /ws/   {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
