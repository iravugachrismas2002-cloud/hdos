// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type * as T from "./types";
import type * as V from "./venture-types";

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
  readiness: (id:string) => get<{requirementsConfigured:boolean;requirementsVersion:number;ready:boolean;officialUrl:string|null;suggestedDocuments:string[];checklist:{requirementId:string;label:string;categories:string[];mandatory:boolean;minimumCount:number;documentIds:string[];status:string;needsConfirmation:boolean;available:boolean}[];missing:{requirementId:string;label:string;categories:string[];mandatory:boolean;minimumCount:number;documentIds:string[];status:string;needsConfirmation:boolean;available:boolean}[]}>(`/applications/${encodeURIComponent(id)}/document-readiness`),
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
  update: (id: string, input: Partial<T.GoalInput>) => send<T.Goal>("patch", `/goals/${id}`, input),
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
  send: (message: string, goalId?: string | null, ventureId?: string | null) =>
    send<T.ChatReply>("post", "/chat", { message, goalId: goalId ?? null, ...(ventureId ? { ventureId } : {}) }),
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

// ───────────── Venture Builder (docs/VENTURE_BUILDER.md) ─────────────

const VB = "/venture-builder";
const enc = encodeURIComponent;
const vp = (id: string) => `${VB}/projects/${enc(id)}`;

/** Like `send`, but lets a call add request headers (used for `Idempotency-Key`). Existing helpers are unchanged. */
const sendWith = async <R>(method: "post" | "put" | "patch", url: string, body: unknown, headers: Record<string, string>): Promise<R> =>
  (await http.request<{ data: R }>({ method, url, data: body, headers })).data.data;

/** A fresh key per click: retries of the same click are safe, a new click is a new generation. */
const idempotencyHeaders = (): Record<string, string> => ({
  "Idempotency-Key": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
});

const del = async (url: string) => {
  await http.delete(url);
};

/** The `details[].message` list of an API error (for example the unmet requirements of a 409 stage gate). */
export const getErrorDetails = (error: unknown): string[] =>
  axios.isAxiosError<T.ApiErrorBody>(error) ? (error.response?.data?.error?.details ?? []).map((d) => d.message) : [];

const crud = <Row, Input>(segment: string) => ({
  list: (id: string) => get<Row[]>(`${vp(id)}/${segment}`),
  create: (id: string, input: Input) => send<Row>("post", `${vp(id)}/${segment}`, input),
  update: (id: string, itemId: string, input: Partial<Input>) => send<Row>("patch", `${vp(id)}/${segment}/${enc(itemId)}`, input),
  remove: (id: string, itemId: string) => del(`${vp(id)}/${segment}/${enc(itemId)}`),
});

export const ventureApi = {
  // Not project-scoped
  dashboard: () => get<V.VentureDashboard>(`${VB}/dashboard`),
  teamRoles: () => get<V.TeamRoleTemplate[]>(`${VB}/team/roles`),
  ecosystem: () => get<V.EcosystemEntry[]>(`${VB}/ecosystem`),
  invitations: () => get<V.Invitation[]>(`${VB}/invitations`),
  respondToInvitation: (memberId: string, accept: boolean) =>
    send<{ accepted: boolean; projectId: string }>("post", `${VB}/invitations/${enc(memberId)}/${accept ? "accept" : "decline"}`, {}),

  // Projects & lifecycle
  create: (input: V.VentureProjectInput) => send<V.VentureProject>("post", `${VB}/projects`, input),
  get: (id: string) => get<V.VentureDetail>(vp(id)),
  update: (id: string, input: V.VentureProjectUpdate) => send<V.VentureProject>("patch", vp(id), input),
  changeStatus: (id: string, input: V.StatusChangeInput) => send<V.StatusChangeResult>("post", `${vp(id)}/status`, input),
  statusHistory: (id: string) => get<V.StatusHistoryEntry[]>(`${vp(id)}/status-history`),
  activity: (id: string, page: number, pageSize = 25) => list<V.ActivityEntry>(`${vp(id)}/activity`, { page, pageSize }),
  export: (id: string) => get<unknown>(`${vp(id)}/export`),

  // Discovery (AI-capable: idempotent per click)
  runDiscovery: (id: string, input: V.DiscoveryInput) => sendWith<V.DiscoveryReport>("post", `${vp(id)}/discovery`, input, idempotencyHeaders()),
  discovery: (id: string) => get<V.DiscoveryReport | null>(`${vp(id)}/discovery`),

  // Validation
  assumptions: (id: string) => get<V.Assumption[]>(`${vp(id)}/assumptions`),
  createAssumption: (id: string, input: V.AssumptionInput) => send<V.Assumption>("post", `${vp(id)}/assumptions`, input),
  updateAssumption: (id: string, aid: string, input: V.AssumptionUpdate) => send<V.Assumption>("patch", `${vp(id)}/assumptions/${enc(aid)}`, input),
  deleteAssumption: (id: string, aid: string) => del(`${vp(id)}/assumptions/${enc(aid)}`),
  sources: (id: string) => get<V.ResearchSource[]>(`${vp(id)}/sources`),
  createSource: (id: string, input: V.ResearchSourceInput) => send<V.ResearchSource>("post", `${vp(id)}/sources`, input),
  evidence: (id: string, assumptionId?: string) => get<V.Evidence[]>(`${vp(id)}/evidence`, assumptionId ? { params: { assumptionId } } : undefined),
  createEvidence: (id: string, input: V.EvidenceInput) => send<V.Evidence>("post", `${vp(id)}/evidence`, input),
  updateEvidence: (id: string, eid: string, input: V.EvidenceUpdate) => send<V.Evidence>("patch", `${vp(id)}/evidence/${enc(eid)}`, input),
  validationReport: (id: string) => get<V.ValidationReport>(`${vp(id)}/validation-report`),
  segments: crud<V.CustomerSegment, V.CustomerSegmentInput>("segments"),
  competitors: crud<V.Competitor, V.CompetitorInput>("competitors"),
  experiments: (id: string) => get<V.Experiment[]>(`${vp(id)}/experiments`),
  createExperiment: (id: string, input: V.ExperimentInput) => send<V.Experiment>("post", `${vp(id)}/experiments`, input),
  updateExperiment: (id: string, experimentId: string, input: Partial<V.ExperimentInput> & { status?: V.ExperimentStatus }) =>
    send<V.Experiment>("patch", `${vp(id)}/experiments/${enc(experimentId)}`, input),
  recordExperimentResult: (id: string, experimentId: string, input: V.ExperimentResultInput) =>
    send<{ result: V.ExperimentResult; evidence: V.Evidence }>("post", `${vp(id)}/experiments/${enc(experimentId)}/results`, input),

  // Assessment
  runAssessment: (id: string) => send<V.Assessment>("post", `${vp(id)}/assessment`, {}),
  assessment: (id: string) => get<V.AssessmentBundle>(`${vp(id)}/assessment`),
  assessmentPreview: (id: string) => get<V.ReadinessPreview>(`${vp(id)}/assessment/preview`),
  explainAssessment: (id: string) => sendWith<V.AssessmentExplanation>("post", `${vp(id)}/assessment/explain`, {}, idempotencyHeaders()),

  // Product Studio
  generateMvp: (id: string) => sendWith<V.MvpSpec>("post", `${vp(id)}/mvp`, {}, idempotencyHeaders()),
  specs: (id: string) => get<V.MvpSpec[]>(`${vp(id)}/mvp`),
  reviseSpec: (id: string, sid: string, input: V.MvpSpecUpdate) => send<V.MvpSpec>("patch", `${vp(id)}/mvp/${enc(sid)}`, input),
  /** Markdown export as a Blob (the endpoint returns text/markdown, not the JSON envelope). */
  exportSpec: async (id: string, sid: string): Promise<Blob> => (await http.get<Blob>(`${vp(id)}/mvp/${enc(sid)}/export`, { responseType: "blob" })).data,
  features: crud<V.Feature, V.FeatureInput>("features"),
  milestones: crud<V.Milestone, V.MilestoneInput>("milestones"),

  // Business model & financial
  businessModels: (id: string) => get<V.BusinessModel[]>(`${vp(id)}/business-model`),
  saveBusinessModel: (id: string, input: V.BusinessModelInput) => send<V.BusinessModel>("post", `${vp(id)}/business-model`, input),
  compareModels: (id: string, input: V.CompareModelsInput) => send<V.CompareModelsResult>("post", `${vp(id)}/business-model/compare`, input),
  lineItems: {
    list: (id: string) => get<V.LineItem[]>(`${vp(id)}/financial/line-items`),
    create: (id: string, input: V.LineItemInput) => send<V.LineItem>("post", `${vp(id)}/financial/line-items`, input),
    update: (id: string, itemId: string, input: Partial<V.LineItemInput>) => send<V.LineItem>("patch", `${vp(id)}/financial/line-items/${enc(itemId)}`, input),
    remove: (id: string, itemId: string) => del(`${vp(id)}/financial/line-items/${enc(itemId)}`),
  },
  calculateScenarios: (id: string, input: V.ScenarioInput) => send<V.ScenarioSet>("post", `${vp(id)}/financial-scenarios`, input),
  savedScenarios: (id: string) => get<V.SavedScenarioSet[]>(`${vp(id)}/financial-scenarios`),

  // Funding
  fundingMatches: (id: string) => get<V.FundingMatches>(`${vp(id)}/funding-matches`),
  fundingReadiness: (id: string) => send<V.FundingReadiness>("post", `${vp(id)}/funding-readiness`, {}),

  // Team & documents
  members: (id: string) => get<V.Member[]>(`${vp(id)}/members`),
  invite: (id: string, input: V.InviteInput) => send<V.Member>("post", `${vp(id)}/members`, input),
  updateMember: (id: string, memberId: string, input: V.MemberUpdate) => send<V.Member>("patch", `${vp(id)}/members/${enc(memberId)}`, input),
  removeMember: (id: string, memberId: string) => del(`${vp(id)}/members/${enc(memberId)}`),
  documents: (id: string) => get<V.DocumentLink[]>(`${vp(id)}/documents`),
  linkDocument: (id: string, input: { documentId: string; label: string }) => send<V.DocumentLink>("post", `${vp(id)}/documents`, input),
  unlinkDocument: (id: string, linkId: string) => del(`${vp(id)}/documents/${enc(linkId)}`),

  // Growth
  growth: (id: string) => get<V.Growth>(`${vp(id)}/growth`),
  recordKpi: (id: string, input: V.KpiInput) =>
    send<{ id: string; period: string; metric: V.KpiMetric; value: number; note: string | null }>("post", `${vp(id)}/growth/kpis`, input),
};
