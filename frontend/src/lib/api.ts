/**
 * API client centralizado para comunicação com o backend FastAPI.
 * Estratégia de autenticação dupla para compatibilidade total:
 * - Cookie httpOnly (desktops e browsers que aceitam cross-site cookies)
 * - Bearer Authorization header (iOS Safari / ITP / modo privado)
 */

import { tokenStore } from "./token-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  /**
   * Monta os headers de autenticação.
   * Sempre inclui o Bearer token quando disponível (iOS Safari / cross-site).
   * Envia também credentials: "include" para cookies funcionar no desktop.
   */
  private getAuthHeaders(): HeadersInit {
    const token = tokenStore.get();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: "include", // Envia cookies httpOnly (desktop)
    });

    if (res.status === 401) {
      // Token inválido ou expirado: limpa o store
      tokenStore.clear();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }

    // Para 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postForm<T>(path: string, body: URLSearchParams): Promise<T> {
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body.toString(),
      credentials: "include",
    });

    if (res.status === 401) {
      tokenStore.clear();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // Streaming para chat (com buffer para chunks cortados no meio da linha)
  async *streamPost(path: string, body: unknown): AsyncGenerator<string> {
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição de streaming");
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.content) yield data.content;
          if (data.done) return;
        } catch {}
      }
    }
  }
}

export const api = new ApiClient();

// ─── API Methods ────────────────────────────────────────────────────────────

export const authApi = {
  moodleLogin: (username: string, password: string) =>
    api.post<{ access_token: string; user: any }>("/api/auth/moodle-login", { username, password }),
  logout: () => api.post<any>("/api/auth/logout"),
  getMe: () => api.get<any>("/api/auth/me"),
  updateMe: (data: any) => api.put<any>("/api/auth/me", data),
  getWebSocketTicket: () => api.post<{ ticket: string; expires_in: number }>("/api/auth/websocket-ticket"),
};

export const moodleApi = {
  saveCredentials: (username: string, password: string) =>
    api.post<any>("/api/moodle/credentials", { username, password }),
  getStatus: () => api.get<any>("/api/moodle/status"),
  forceSync: () => api.post<any>("/api/moodle/sync"),
  getSyncStatus: () => api.get<any>("/api/moodle/sync/status"),
  reconnect: () => api.post<any>("/api/moodle/reconnect"),
};

export const activitiesApi = {
  list: (params?: { status?: string; course_id?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api.get<any[]>(`/api/activities${q ? `?${q}` : ""}`);
  },
  summary: () => api.get<any>("/api/activities/summary"),
  getDetails: (id: string) =>
    api.get<any>(`/api/activities/${id}/details`),
  updateStatus: (id: string, status: string) =>
    api.post<any>(`/api/activities/${id}/status?status=${encodeURIComponent(status)}`),
  explainWithAI: (id: string) =>
    api.post<any>(`/api/activities/${id}/explain-ai`),
  generateResponsePDF: async (id: string): Promise<Blob> => {
    const token = tokenStore.get();
    const res = await fetch(`${API_BASE}/api/activities/${id}/generate-response-pdf`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro ao gerar PDF");
    }
    return res.blob();
  },
};

export const coursesApi = {
  list: () => api.get<any[]>("/api/courses"),
  getMaterials: (courseId: string) => api.get<any[]>(`/api/courses/${courseId}/materials`),
};

export const gradesApi = {
  list: (courseId?: string) =>
    api.get<any[]>(`/api/grades${courseId ? `?course_id=${courseId}` : ""}`),
};

export const calendarApi = {
  list: () => api.get<any[]>("/api/calendar"),
};

export const briefingApi = {
  getToday: () => api.get<any>("/api/briefing/today"),
  generate: () => api.post("/api/briefing/generate"),
};

export const dashboardApi = {
  getSnapshot: () => api.get<any>("/api/dashboard"),
};

export const chatApi = {
  getSessions: (courseId?: string) =>
    api.get<any[]>(`/api/chat/sessions${courseId ? `?course_id=${courseId}` : ""}`),
  createSession: (courseId?: string, title?: string) =>
    api.post<any>("/api/chat/sessions", { course_id: courseId, title }),
  getMessages: (sessionId: string) =>
    api.get<any[]>(`/api/chat/sessions/${sessionId}/messages`),
  sendMessage: (content: string, sessionId?: string, courseId?: string, stream = false) =>
    api.post<any>("/api/chat/message", { content, session_id: sessionId, course_id: courseId, stream }),
  generateFlashcards: (courseId?: string, content?: string, quantity = 10) =>
    api.post<any>("/api/chat/flashcards/generate", { course_id: courseId, content, quantity }),
  generateQuiz: (courseId?: string, content?: string, quantity = 5) =>
    api.post<any>("/api/chat/quiz/generate", { course_id: courseId, content, quantity }),
  getProviders: () => api.get<any[]>("/api/chat/ai/providers"),
  configureAI: (provider: string, apiKey: string, setDefault?: boolean) =>
    api.post<any>("/api/chat/ai/configure", { provider, api_key: apiKey, set_default: setDefault }),
  testProvider: (provider: string, apiKey?: string) =>
    api.post<any>("/api/chat/ai/test", { provider, api_key: apiKey }),
};

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<any[]>(`/api/notifications${unreadOnly ? "?unread_only=true" : ""}`),
  unreadCount: () => api.get<{ count: number }>("/api/notifications/unread-count"),
  markRead: (id: string) => api.put<any>(`/api/notifications/${id}/read`),
  markAllRead: () => api.put<any>("/api/notifications/read-all"),
  updateSettings: (settings: any) => api.put<any>("/api/notifications/settings", settings),
};

export const scheduleApi = {
  get: () => api.get<any[]>("/api/schedule"),
  getToday: () => api.get<any>("/api/schedule/today"),
  add: (slot: any) => api.post<any>("/api/schedule", slot),
  delete: (id: string) => api.delete<any>(`/api/schedule/${id}`),
};
