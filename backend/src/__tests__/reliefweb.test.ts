import { afterEach, describe, expect, it, vi } from "vitest";
import { getReliefWebJob, ReliefWebFeedError, searchReliefWebJobs } from "../modules/catalog/reliefweb.service";

const apiItem = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  fields: {
    title: "WASH Officer",
    url: `https://reliefweb.int/job/${id}`,
    body: "<p>Support <strong>water</strong> programmes &amp; field work.</p><script>ignore()</script>",
    country: [{ name: "Rwanda" }],
    city: [{ name: "Kigali" }],
    source: [{ name: "Example NGO" }],
    career_categories: [{ name: "Program/Project Management" }],
    experience: [{ name: "Entry level" }],
    date: { created: "2026-11-01T08:00:00+00:00", closing: "2026-11-30T23:59:00+00:00" },
    ...overrides,
  },
});

afterEach(() => vi.restoreAllMocks());

describe("ReliefWeb opportunity feed client", () => {
  it("requests Rwanda jobs and maps source dates, descriptions and links", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      totalCount: 1, data: [apiItem(12)],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await searchReliefWebJobs({ appName: "approved-hdos-test", page: 1, pageSize: 10, query: "WASH" }, fetcher);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      externalId: "12", title: "WASH Officer", organization: "Example NGO", country: "Rwanda", city: "Kigali",
      description: "Support water programmes & field work.",
      url: "https://reliefweb.int/job/12",
      careerCategories: ["Program/Project Management"], experience: ["Entry level"],
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("appname=approved-hdos-test");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      filter: { field: "country.name", value: "Rwanda" }, query: { value: "WASH" }, limit: 10,
    });
  });

  it("reuses a short-lived cache for the same app and query", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ totalCount: 0, data: [] }), { status: 200 }));
    await searchReliefWebJobs({ appName: "approved-cache-test", page: 7, pageSize: 1, query: "cache-proof" }, fetcher);
    await searchReliefWebJobs({ appName: "approved-cache-test", page: 7, pageSize: 1, query: "cache-proof" }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe URLs and surfaces approved-appname failures", async () => {
    const invalidUrlFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ totalCount: 1, data: [apiItem(4, { url: "javascript:alert(1)" })] }), { status: 200 }));
    const unsafe = await searchReliefWebJobs({ appName: "approved-unsafe-test", page: 1, pageSize: 5 }, invalidUrlFetch);
    expect(unsafe.items).toEqual([]);

    const forbidden = vi.fn<typeof fetch>().mockResolvedValue(new Response("forbidden", { status: 403 }));
    await expect(searchReliefWebJobs({ appName: "unapproved-test-key", page: 1, pageSize: 5 }, forbidden)).rejects.toBeInstanceOf(ReliefWebFeedError);
  });

  it("re-fetches an item by ReliefWeb ID for secure tracking", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: apiItem(77) }), { status: 200 }));
    const result = await getReliefWebJob("77", "approved-track-test", fetcher);
    expect(result.externalId).toBe("77");
    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.reliefweb.int/v2/jobs/77?appname=approved-track-test");
  });
});
