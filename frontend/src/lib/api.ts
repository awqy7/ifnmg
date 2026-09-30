/**
 * API client centralizado para comunicação com o backend FastAPI.
 * A API usa sempre a mesma origem no navegador e passa pelo proxy do frontend.
 * Isso mantém o cookie como first-party em todos os ambientes.
 */

const API_BASE = "";

function notifyUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-expired"));
  }
}

class ApiClient {
  private responseCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

  clearCache() {
    this.responseCache.clear();
  }

  /**
   * O proxy de mesma origem envia somente o cookie httpOnly de sessão.
   */
  private getAuthHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
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
      // Sessão inválida ou expirada: atualiza a interface de autenticação.
      notifyUnauthorized();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição");
    }

    if (options.method && options.method !== "GET") this.clearCache();

    // Para 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async getCached<T>(path: string, ttlMs = 30_000): Promise<T> {
    const cached = this.responseCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.value as Promise<T>;
    const value = this.get<T>(path).catch((error) => {
      this.responseCache.delete(path);
      throw error;
    });
    this.responseCache.set(path, { expiresAt: Date.now() + ttlMs, value });
    return value;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postForm<T>(path: string, body: URLSearchParams): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      credentials: "include",
    });

    if (res.status === 401) notifyUnauthorized();
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

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async download(path: string): Promise<{ blob: Blob; filename: string }> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    if (res.status === 401) notifyUnauthorized();
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Não foi possível baixar o arquivo");
    }

    const disposition = res.headers.get("content-disposition") || "";
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const simpleMatch = disposition.match(/filename="?([^";]+)"?/i);
    let filename = "arquivo";
    try {
      filename = utf8Match ? decodeURIComponent(utf8Match[1]) : simpleMatch?.[1] || filename;
    } catch {
      filename = simpleMatch?.[1] || filename;
    }
    return { blob: await res.blob(), filename };
  }

  // Streaming para chat (com buffer para chunks cortados no meio da linha)
  async *streamPost(path: string, body: unknown): AsyncGenerator<string> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (res.status === 401) notifyUnauthorized();
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro na requisição de streaming");
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    const parseLine = (line: string): { content?: string; done?: boolean } | null => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) return null;
      try {
        return JSON.parse(trimmed.slice(6));
      } catch {
        return null;
      }
    };

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const data = parseLine(line);
        if (data?.content) yield data.content;
        if (data?.done) return;
      }
    }
    buffer += decoder.decode();
    const finalData = parseLine(buffer);
    if (finalData?.content) yield finalData.content;
  }
}

export const api = new ApiClient();

// ─── API Methods ────────────────────────────────────────────────────────────

export const authApi = {
  moodleLogin: (username: string, password: string) =>
    api.post<{ user: any }>("/api/auth/moodle-login", { username, password }),
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
    const path = `/api/activities${q ? `?${q}` : ""}`;
    return api.getCached<any[]>(path, 20_000);
  },
  summary: () => api.getCached<any>("/api/activities/summary", 20_000),
  getDetails: (id: string) =>
    api.get<any>(`/api/activities/${id}/details`),
  updateStatus: (id: string, status: string) =>
    api.post<any>(`/api/activities/${id}/status?status=${encodeURIComponent(status)}`),
  updateManualCompletion: (
    id: string,
    completed: boolean,
    reason = "group_member_submitted",
    note?: string
  ) => api.patch<any>(`/api/activities/${id}/manual-completion`, {
    completed,
    reason,
    note,
  }),
  submitToMoodle: async (id: string, submission: FormData) => {
    const res = await fetch(`${API_BASE}/api/activities/${id}/submit`, {
      method: "POST",
      body: submission,
      credentials: "include",
    });
    if (res.status === 401) notifyUnauthorized();
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Não foi possível enviar a atividade ao Virtual2.");
    }
    return res.json();
  },
  explainWithAI: (id: string) =>
    api.post<any>(`/api/activities/${id}/explain-ai`),
  downloadAttachment: (id: string, fileIndex: number) =>
    api.download(`/api/activities/${id}/files/${fileIndex}/download`),
  generateResponsePDF: async (id: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/api/activities/${id}/generate-response-pdf`, {
      method: "POST",
      credentials: "include",
    });
    if (res.status === 401) notifyUnauthorized();
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro ao gerar PDF");
    }
    return res.blob();
  },
};

export const coursesApi = {
  list: () => api.getCached<any[]>("/api/courses", 60_000),
  getMaterials: (courseId: string) => api.getCached<any[]>(`/api/courses/${courseId}/materials`, 60_000),
  downloadMaterial: (courseId: string, materialId: string, fileIndex = 0) =>
    api.download(`/api/courses/${courseId}/materials/${materialId}/download?file_index=${fileIndex}`),
  explainMaterial: (courseId: string, materialId: string) =>
    api.post<any>(`/api/courses/${courseId}/materials/${materialId}/explain-ai`),
};

export function saveDownloadedFile(download: { blob: Blob; filename: string }, fallbackName = "arquivo") {
  const url = URL.createObjectURL(download.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = download.filename || fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const briefingApi = {
  getToday: () => api.get<any>("/api/briefing/today"),
  generate: () => api.post("/api/briefing/generate"),
};

export const dashboardApi = {
  getSnapshot: () => api.getCached<any>("/api/dashboard", 20_000),
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
  streamMessage: (content: string, sessionId: string, courseId?: string) =>
    api.streamPost("/api/chat/message", {
      content,
      session_id: sessionId,
      course_id: courseId,
      stream: true,
    }),
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
  getSettings: () => api.get<Record<string, boolean | string>>("/api/notifications/settings"),
  updateSettings: (settings: any) => api.put<any>("/api/notifications/settings", settings),
  getPushPublicKey: () => api.get<{ public_key: string | null }>("/api/notifications/push-public-key"),
  subscribePush: (subscription: PushSubscriptionJSON) =>
    api.post<any>("/api/notifications/push-subscribe", { subscription }),
};
