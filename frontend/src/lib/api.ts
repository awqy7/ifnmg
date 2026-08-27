/**
 * API client centralizado para comunicação com o backend FastAPI.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("ifnmg_token", token);
    } else {
      localStorage.removeItem("ifnmg_token");
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      return localStorage.getItem("ifnmg_token");
    }
    return null;
  }

  private headers(): HeadersInit {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  async postForm<T>(path: string, body: URLSearchParams): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }
    return res.json();
  }

  // Streaming para chat (com buffer para chunks cortados no meio da linha)
  async *streamPost(path: string, body: unknown): AsyncGenerator<string> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
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
      buffer = lines.pop() ?? ""; // última linha pode estar incompleta
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
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/api/activities/${id}/generate-response-pdf`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
