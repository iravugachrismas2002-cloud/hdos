// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type * as T from "./types";

// ───────────── Token handling: the access token lives in memory only (never localStorage) ─────────────

let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const setSessionLostHandler = (handler: (() => void) | null) => {
  onSessionLost = handler;
};

const http = axios.create({ baseURL: "/api", withCredentials: true, headers: { "Content-Type": "application/json" } });

let pendingRequests = 0;
let slowRequestTimer: ReturnType<typeof setTimeout> | undefined;
let startupNoticeVisible = false;

const emitStartupNotice = (visible: boolean) => {
  if (typeof window === "undefined" || startupNoticeVisible === visible) return;
  startupNoticeVisible = visible;
  window.dispatchEvent(new CustomEvent("hdos:api-starting", { detail: visible }));
};

const requestStarted = () => {
  pendingRequests += 1;
  if (pendingRequests === 1) {
    slowRequestTimer = setTimeout(() => {
      if (pendingRequests > 0) emitStartupNotice(true);
    }, 8000);
  }
};

const requestFinished = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    if (slowRequestTimer) clearTimeout(slowRequestTimer);
    slowRequestTimer = undefined;
    emitStartupNotice(false);
  }
};

http.interceptors.request.use((config) => {
  requestStarted();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

interface Session { accessToken: string; user: T.User }

// A single in-flight refresh shared by every caller (React strict mode and parallel queries would
// otherwise rotate the same cookie several times).
let refreshing: Promise<Session> | null = null;

export const refreshSession = (): Promise<Session> => {
  refreshing ??= (async () => {
    const retryDelays = [2_000, 5_000, 8_000, 12_000, 15_000];
    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await http.post<{ data: Session }>("/auth/refresh");
        accessToken = res.data.data.accessToken;
        return res.data.data;
      } catch (error) {
        const delay = retryDelays[attempt];
        if (delay === undefined || !isTemporaryStartupError(error)) throw error;
        await wait(delay);
      }
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

http.interceptors.response.use(
  (response) => {
    requestFinished();
    return response;
  },
  async (error: AxiosError<T.ApiErrorBody>) => {
  requestFinished();
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status === 401 && error.response.data?.error?.code === "TOKEN_EXPIRED" && original && !original._retried) {
    original._retried = true;
    try {
      await refreshSession();
      return http(original);
    } catch {
      accessToken = null;
      onSessionLost?.();
    }
  }
  return Promise.reject(error);
  },
);

/** Extracts the API's `{ error: { message } }` envelope, falling back to a generic message. */
export const getErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  if (axios.isAxiosError<T.ApiErrorBody>(error)) {
    if ([502, 503, 504].includes(error.response?.status ?? 0)) {
      return "HDOS is still waking up. Please wait a little longer, then try signing in again.";
    }
    const body = error.response?.data?.error;
    if (body?.details?.length) return body.details.map((d) => d.message).join(". ");
    if (body?.message) return body.message;
    if (!error.response) return "Cannot reach the server. Check your connection.";
  }
  return fallback;
};

const isTemporaryStartupError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  return !error.response || [502, 503, 504].includes(error.response.status);
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getErrorCode = (error: unknown): string | undefined =>
  axios.isAxiosError<T.ApiErrorBody>(error) ? error.response?.data?.error?.code : undefined;

// ───────────── Typed endpoint helpers ─────────────

const get = async <R>(url: string, config?: AxiosRequestConfig): Promise<R> => (await http.get<{ data: R }>(url, config)).data.data;
const list = async <R>(url: string, params?: Record<string, unknown>): Promise<{ data: R[]; meta: T.Meta }> =>
  (await http.get<{ data: R[]; meta: T.Meta }>(url, { params })).data;
const send = async <R>(method: "post" | "put" | "patch", url: string, body?: unknown): Promise<R> =>
  (await http.request<{ data: R }>({ method, url, data: body })).data.data;

export const authApi = {
  login: async (email: string, password: string) => {
    // Render Free may return a temporary gateway/network error while the API wakes.
    // Keep the login UI in its waiting state and retry only transient failures;
    // credentials and validation errors are returned immediately.
    requestStarted();
    try {
      const retryDelays = [2_000, 5_000, 8_000, 12_000, 15_000];
      for (let attempt = 0; ; attempt += 1) {
        try {
          const session = await send<Session>("post", "/auth/login", { email, password });
          accessToken = session.accessToken;
          return session;
        } catch (error) {
          const delay = retryDelays[attempt];
          if (delay === undefined || !isTemporaryStartupError(error)) throw error;
          await wait(delay);
        }
      }
    } finally {
      requestFinished();
    }
  },
  register: (body: { email: string; password: string; name?: string; role: T.Role }) =>
    send<{ user: T.User; requiresVerification: boolean }>("post", "/auth/register", body),
  logout: async () => {
    try {
      await http.post("/auth/logout");
    } finally {
      accessToken = null;
    }
  },
  verifyEmail: (token: string) => send<{ message: string }>("post", "/auth/verify-email", { token }),
  resendVerification: (email: string) => send<{ message: string }>("post", "/auth/resend-verification", { email }),
  forgotPassword: (email: string) => send<{ message: string }>("post", "/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => send<{ message: string }>("post", "/auth/reset-password", { token, password }),
  me: () => get<{ user: T.User }>("/auth/me"),
  deleteAccount: async (password: string) => {
    await http.delete("/account", { data: { password } });
    accessToken = null;
  },
};

export const profileApi = {
  get: () => get<{ profile: T.Profile | null }>("/profile").then((r) => r.profile),
  save: (input: T.ProfileInput) => send<{ profile: T.Profile }>("put", "/profile", input).then((r) => r.profile),
  saveAvatar: (avatarData: string | null) => send<{ avatarData: string | null }>("patch", "/profile/avatar", { avatarData }).then((r) => r.avatarData),
};

export const catalogApi = {
  districts: () => get<T.District[]>("/catalog/districts"),
  sectors: () => get<T.Sector[]>("/catalog/sectors"),
  skills: (q: string) => get<T.Skill[]>("/catalog/skills", { params: { q } }),
  occupations: (params: Record<string, unknown>) => list<T.Occupation>("/catalog/occupations", params),
  programs: (params: Record<string, unknown>) => list<T.Program>("/catalog/programs", params),
  opportunities: (params: Record<string, unknown>) => list<T.Opportunity>("/catalog/opportunities", params),
  opportunitySources: () => get<T.OpportunitySource[]>("/catalog/opportunity-sources"),
  paths: (params: Record<string, unknown>) => list<T.PathSummary>("/catalog/paths", params),
  path: (slug: string) => get<T.PathDetail>(`/catalog/paths/${encodeURIComponent(slug)}`),
};

export const applicationsApi = {
  list: () => get<Array<{ id: string; status: string; notes: string | null; updatedAt: string; submittedAt:string|null; receiptReference:string|null; events:{id:string;status:string;detail:string|null;createdAt:string}[]; opportunity: T.Opportunity }>>("/applications"),
  create: (opportunityId: string) => send<{ id: string; status: string }>("post", "/applications", { opportunityId }),
  aiPrepare: (id: string) => send<{ applicationId: string; status: string; attached: number; missing: string[]; reviewRequired: boolean }>("post", `/applications/${encodeURIComponent(id)}/ai-prepare`, {}),
  eligibility: (id: string) => get<T.ApplicationEligibility>(`/applications/${encodeURIComponent(id)}/eligibility`),
  status: (id: string, status: string, notes?: string, confirmSubmission?:boolean) => send<{ id: string; status: string }>("patch", `/applications/${encodeURIComponent(id)}/status`, { status, notes, confirmSubmission }),
  documents: () => get<Array<{id:string;groupId:string;version:number;kind:string;status:string;fileName:string;mimeType:string;sizeBytes:number;sha256:string;expiresAt:string|null;extractionConfirmedAt:string|null;createdAt:string;extractedText:{text?:string}|null}>>("/applications/documents"),
  uploadDocument: async (file: File, kind: string, replaceId?:string, expiresAt?:string) => { const r = await http.post("/applications/documents", file, { headers: { "Content-Type": file.type, "X-File-Name": file.name, "X-Document-Kind": kind, ...(replaceId?{"X-Replace-Document-Id":replaceId}:{}), ...(expiresAt?{"X-Expires-At":expiresAt}:{}) } }); return r.data.data; },
  downloadDocument: async (id:string,name:string) => { const r=await http.get(`/applications/documents/${encodeURIComponent(id)}/download`,{responseType:"blob"});const url=URL.createObjectURL(r.data as Blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url); },
  readiness: (id:string) => get<{requirementsConfigured:boolean;requirementsVersion:number;ready:boolean;checklist:{requirementId:string;label:string;categories:string[];mandatory:boolean;minimumCount:number;documentIds:string[];status:string;needsConfirmation:boolean;available:boolean}[];missing:{requirementId:string;label:string;categories:string[];mandatory:boolean;minimumCount:number;documentIds:string[];status:string;needsConfirmation:boolean;available:boolean}[]}>(`/applications/${encodeURIComponent(id)}/document-readiness`),
  attachDocuments: (id:string,documentIds:string[]) => send("post",`/applications/${encodeURIComponent(id)}/documents`,{documentIds}),
  confirmExtraction: (id:string) => send("patch", `/applications/documents/${encodeURIComponent(id)}/confirm-extraction`, { confirmed: true }),
  deleteDocument: async (id:string) => { await http.delete(`/applications/documents/${encodeURIComponent(id)}`); },
  receipt: (id:string, reference:string) => send("patch", `/applications/${encodeURIComponent(id)}/receipt`, { reference }),
  package: (id:string) => get(`/applications/${encodeURIComponent(id)}/package`),
};

export const insightsApi = {
  national: () => get<{ indicators: T.Indicator[] }>("/insights/national").then((r) => r.indicators),
  districts: () => get<T.DistrictInsights>("/insights/districts"),
};

export const goalsApi = {
  list: () => get<T.Goal[]>("/goals"),
  get: (id: string) => get<T.Goal>(`/goals/${id}`),
  create: (input: T.GoalInput) => send<T.Goal>("post", "/goals", input),
  remove: async (id: string) => {
    await http.delete(`/goals/${id}`);
  },
  recommendations: (id: string) => get<T.Recommendations>(`/goals/${id}/recommendations`),
  roadmap: (id: string) => get<{ roadmap: T.Roadmap | null }>(`/goals/${id}/roadmap`).then((r) => r.roadmap),
  generateRoadmap: (id: string) => send<{ roadmap: T.Roadmap }>("post", `/goals/${id}/roadmap`).then((r) => r.roadmap),
  setStepStatus: (id: string, stepId: string, status: T.StepStatus) =>
    send<{ step: { id: string; status: T.StepStatus }; progress: number }>("patch", `/goals/${id}/roadmap/steps/${stepId}`, { status }),
  explain: (id: string) => send<T.Explanation>("post", `/goals/${id}/explain`),
  guidance: (id: string) => send<T.GoalGuidance>("post", `/goals/${id}/guidance`),
};

export const chatApi = {
  history: () => get<T.ChatMsg[]>("/chat/history"),
  send: (message: string, goalId?: string | null) => send<T.ChatReply>("post", "/chat", { message, goalId: goalId ?? null }),
  clear: async () => {
    await http.delete("/chat/history");
  },
};

export const adminApi = {
  overview: () => get<T.AnalyticsOverview>("/analytics/overview"),
  users: (page: number) => list<T.AdminUser>("/admin/users", { page, pageSize: 20 }),
  setRole: (id: string, role: T.Role) => send<T.AdminUser>("patch", `/admin/users/${id}/role`, { role }),
  audit: (page: number) => list<T.AuditEntry>("/admin/audit-log", { page, pageSize: 20 }),
  monitoring: () => get<T.MonitoringReport>("/admin/monitoring"),
  probeAi: () => send<{ providers: T.ProviderStatus[] }>("post", "/admin/monitoring/ai-probe"),
};
