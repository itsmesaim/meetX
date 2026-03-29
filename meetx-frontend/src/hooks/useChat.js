import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Manages a STOMP connection to /ws and subscribes to /topic/chat/{roomCode}.
 * Exposes messages, a send function, and connection status.
 */
export function useChat(roomCode, currentUser, initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!roomCode) return;

    const client = new Client({
      // Use SockJS so it works across all environments
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 3000,

      onConnect: () => {
        setConnected(true);

        client.subscribe(`/topic/chat/${roomCode}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            setMessages((prev) => [...prev, msg]);
          } catch (e) {
            console.warn("Failed to parse chat message", e);
          }
        });
      },

      onDisconnect: () => setConnected(false),

      onStompError: (frame) => {
        console.error("STOMP error", frame);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [roomCode]);

  const sendMessage = useCallback(
    (content) => {
      if (!clientRef.current?.connected || !content.trim()) return;

      clientRef.current.publish({
        destination: `/app/chat/${roomCode}`,
        body: JSON.stringify({
          sender: currentUser,
          content: content.trim(),
        }),
      });
    },
    [roomCode, currentUser],
  );

  return { messages, sendMessage, connected };
}
