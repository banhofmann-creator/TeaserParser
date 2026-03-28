"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types";
import * as api from "@/lib/api";

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .chatHistory()
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    setSending(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      user_id: 0,
      role: "user",
      content,
      actions: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendChat(content);
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        user_id: 0,
        role: "assistant",
        content: res.message,
        actions: res.actions,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setSending(false);
    }
  }, []);

  return { messages, loading, sending, error, sendMessage };
}
