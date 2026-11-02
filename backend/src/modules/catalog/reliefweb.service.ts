export interface ReliefWebJob {
  externalId: string;
  title: string;
  url: string;
  organization: string;
  description: string | null;
  country: string | null;
  city: string | null;
  createdAt: string | null;
  closingAt: string | null;
  careerCategories: string[];
  experience: string[];
}

export interface ReliefWebJobPage {
  items: ReliefWebJob[];
  page: number;
  pageSize: number;
  total: number;
  fetchedAt: string;
}

export class ReliefWebFeedError extends Error {
  constructor(message: string, readonly statusCode = 502) {
    super(message);
    this.name = "ReliefWebFeedError";
  }
}

const BASE = "https://api.reliefweb.int/v2/jobs";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { until: number; value: ReliefWebJobPage }>();
const inFlight = new Map<string, Promise<ReliefWebJobPage>>();

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const string = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const nestedNames = (value: unknown): string[] => Array.isArray(value)
  ? value.map((item) => string(object(item).name)).filter((item): item is string => item !== null)
  : [];
const isoOrNull = (value: unknown): string | null => {
  const input = string(value);
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const cleanDescription = (value: unknown): string | null => {
  const html = string(value);
  if (!html) return null;
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 1800) : null;
};

const parseJob = (row: unknown): ReliefWebJob | null => {
  const item = object(row);
  const fields = object(item.fields);
  const title = string(fields.title);
  const url = string(fields.url);
  const id = item.id;
  if (!title || !url || (typeof id !== "string" && typeof id !== "number")) return null;
  let safeUrl: URL;
  try { safeUrl = new URL(url); } catch { return null; }
  if (safeUrl.protocol !== "https:") return null;
  const date = object(fields.date);
  const primaryCountry = object(fields.primary_country);
  const country = nestedNames(fields.country)[0] ?? string(primaryCountry.name);
  const city = nestedNames(fields.city)[0];
  return {
    externalId: String(id), title, url: safeUrl.toString(),
    organization: nestedNames(fields.source)[0] ?? "ReliefWeb listing",
    description: cleanDescription(fields.body), country, city,
    createdAt: isoOrNull(object(date.created).date ?? date.created),
    closingAt: isoOrNull(object(date.closing).date ?? date.closing),
    careerCategories: nestedNames(fields.career_categories),
    experience: nestedNames(fields.experience),
  };
};

const request = async (appName: string, payload: Record<string, unknown>, fetcher: typeof fetch): Promise<Record<string, unknown>> => {
  const url = new URL(BASE);
  url.searchParams.set("appname", appName);
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 403) throw new ReliefWebFeedError("ReliefWeb rejected the configured app name. Confirm it has been approved by ReliefWeb.", 503);
  if (response.status === 429) throw new ReliefWebFeedError("ReliefWeb is rate-limiting requests. Try again shortly.", 503);
  if (!response.ok) throw new ReliefWebFeedError(`ReliefWeb returned HTTP ${response.status}.`, 502);
  return object(await response.json());
};

const FIELDS = ["body", "city", "career_categories", "experience", "how_to_apply", "primary_country"];

export const searchReliefWebJobs = async (
  input: { appName: string; page: number; pageSize: number; query?: string },
  fetcher: typeof fetch = fetch,
): Promise<ReliefWebJobPage> => {
  const query = input.query?.trim().slice(0, 80) ?? "";
  const key = `${input.appName}|${input.page}|${input.pageSize}|${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = async (): Promise<ReliefWebJobPage> => {
    const payload: Record<string, unknown> = {
      preset: "latest",
      profile: "list",
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      sort: ["date.created:desc"],
      filter: { field: "country.name", value: "Rwanda" },
      fields: { include: FIELDS },
    };
    if (query) payload.query = { value: query, fields: ["title", "body", "source.name"] };
    const response = await request(input.appName, payload, fetcher);
    const items = Array.isArray(response.data) ? response.data.map(parseJob).filter((job): job is ReliefWebJob => job !== null) : [];
    const page = {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total: typeof response.totalCount === "number" ? response.totalCount : items.length,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, { value: page, until: Date.now() + CACHE_TTL_MS });
    return page;
  };
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
};

export const getReliefWebJob = async (id: string, appName: string, fetcher: typeof fetch = fetch): Promise<ReliefWebJob> => {
  const url = new URL(`${BASE}/${encodeURIComponent(id)}`);
  url.searchParams.set("appname", appName);
  const itemResponse = await fetcher(url, {
    method: "GET", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000),
  });
  if (itemResponse.status === 403) throw new ReliefWebFeedError("ReliefWeb rejected the configured app name. Confirm it has been approved by ReliefWeb.", 503);
  if (itemResponse.status === 429) throw new ReliefWebFeedError("ReliefWeb is rate-limiting requests. Try again shortly.", 503);
  if (!itemResponse.ok) throw new ReliefWebFeedError(`ReliefWeb returned HTTP ${itemResponse.status}.`, 502);
  const parsed = parseJob(object(await itemResponse.json()).data);
  if (!parsed) throw new ReliefWebFeedError("ReliefWeb returned an invalid job record.", 502);
  return parsed;
};
