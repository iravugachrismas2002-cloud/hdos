// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Full user journey against a real, migrated and seeded PostgreSQL database:
// Register -> Login -> Profile -> Goal -> Recommendations -> Roadmap -> Opportunities -> AI chatbot ->
// Save progress -> Logout -> Login (data persisted). Also covers password reset and the admin dashboard.
// Skipped unless TEST_DATABASE_URL is set (CI provides it).
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

// AI keys are set so the provider chain is exercised; fetch is stubbed so nothing leaves the machine.
process.env.GEMINI_API_KEY = "test-gemini";
process.env.GROQ_API_KEY = "test-groq";
process.env.OPENROUTER_API_KEY = "test-openrouter";
process.env.AI_TIMEOUT_MS = "1000";

const sent: { type: "verify" | "reset"; to: string; token: string }[] = [];
vi.mock("../modules/auth/mailer", () => ({
  sendVerificationEmail: async (to: string, _name: string | null, token: string) => void sent.push({ type: "verify", to, token }),
  sendPasswordResetEmail: async (to: string, _name: string | null, token: string) => void sent.push({ type: "reset", to, token }),
}));

let providerBehaviour: Record<string, "ok" | "fail"> = {};
const stubProviders = () =>
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const u = String(input);
    const id = u.includes("googleapis") ? "gemini" : u.includes("groq") ? "groq" : "openrouter";
    if ((providerBehaviour[id] ?? "ok") === "fail") return new Response("down", { status: 503 });
    const text = `Reply from ${id}`;
    return Response.json(id === "gemini" ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] });
  });

const suite = url ? describe : describe.skip;

suite("User journey", () => {
  let app: import("express").Application;
  const unique = Date.now();
  const user = { email: `journey${unique}@example.com`, password: "Journey@1234!", name: "Journey Tester", role: "STUDENT" };
  let token = "";
  let cookie: string[] = [];
  let goalId = "";
  let stepId = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const login = async (email: string, password: string) =>
    request(app).post("/api/auth/login").send({ email, password });

  beforeAll(async () => {
    stubProviders();
    const { createApp } = await import("../app");
    app = createApp();
  });

  it("registers and logs in", async () => {
    const reg = await request(app).post("/api/auth/register").send(user);
    expect(reg.status).toBe(201);
    expect(sent.some((m) => m.type === "verify" && m.to === user.email)).toBe(true);

    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    token = res.body.data.accessToken;
    cookie = res.headers["set-cookie"] as unknown as string[];
    expect(cookie[0]).toMatch(/HttpOnly/i);
    expect(res.body.data.user.profileComplete).toBe(false);
  });

  it("keeps the session across a reload via the refresh cookie", async () => {
    const res = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(res.status).toBe(200);
    token = res.body.data.accessToken;
    cookie = res.headers["set-cookie"] as unknown as string[];
    const me = await request(app).get("/api/auth/me").set(auth());
    expect(me.body.data.user.email).toBe(user.email);
  });

  it("completes the profile", async () => {
    const skills = (await request(app).get("/api/catalog/skills?q=Programming")).body.data;
    const sectors = (await request(app).get("/api/catalog/sectors")).body.data;
    const districts = (await request(app).get("/api/catalog/districts")).body.data;
    expect(skills.length).toBeGreaterThan(0);
    const res = await request(app)
      .put("/api/profile")
      .set(auth())
      .send({
        educationLevel: "UPPER_SECONDARY",
        districtId: districts.find((d: { name: string }) => d.name === "Huye").id,
        skills: [{ skillId: skills[0].id, level: 2 }],
        sectorIds: [sectors.find((s: { code: string }) => s.code === "ICT").id],
        bio: "Learning to code",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.completeness).toBeGreaterThanOrEqual(55);
    expect((await request(app).get("/api/auth/me").set(auth())).body.data.user.profileComplete).toBe(true);
  });

  it("selects a goal and gets recommendations, programmes and opportunities", async () => {
    const occ = (await request(app).get("/api/catalog/occupations?q=Software")).body.data[0];
    expect(occ).toBeTruthy();
    const created = await request(app).post("/api/goals").set(auth()).send({ title: "Become a software developer", category: "CAREER", targetOccupationId: occ.id });
    expect(created.status).toBe(201);
    goalId = created.body.data.id;

    const rec = await request(app).get(`/api/goals/${goalId}/recommendations`).set(auth());
    expect(rec.status).toBe(200);
    expect(rec.body.data.occupations.length).toBeGreaterThan(0);
    expect(rec.body.data.programs.length).toBeGreaterThan(0);
    expect(rec.body.data.opportunities.length).toBeGreaterThan(0);

    const opps = await request(app).get("/api/catalog/opportunities?pageSize=50");
    expect(opps.body.data.length).toBeGreaterThanOrEqual(20);
    expect(opps.body.data.every((o: { url: string | null }) => !o.url || o.url.startsWith("https://"))).toBe(true);
  });

  it("generates a roadmap and saves progress", async () => {
    const gen = await request(app).post(`/api/goals/${goalId}/roadmap`).set(auth());
    expect(gen.status).toBe(200);
    const roadmap = gen.body.data.roadmap;
    expect(roadmap.steps.length).toBeGreaterThan(3);
    expect(roadmap.summary).toBeTruthy();
    stepId = roadmap.steps[0].id;
    const upd = await request(app).patch(`/api/goals/${goalId}/roadmap/steps/${stepId}`).set(auth()).send({ status: "DONE" });
    expect(upd.status).toBe(200);
    expect(upd.body.data.progress).toBeGreaterThan(0);
  });

  it("serves learning paths and career roadmaps from the catalog", async () => {
    const list = await request(app).get("/api/catalog/paths?type=CAREER_ROADMAP&pageSize=50");
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(20);
    const detail = await request(app).get(`/api/catalog/paths/${list.body.data[0].slug}`);
    expect(detail.body.data.steps.length).toBeGreaterThanOrEqual(3);
    expect((await request(app).get("/api/catalog/paths/does-not-exist")).status).toBe(404);
    const learning = await request(app).get("/api/catalog/paths?type=LEARNING_PATH");
    expect(learning.body.meta.total).toBeGreaterThanOrEqual(5);
  });

  it("answers chat questions through the AI provider chain and persists the conversation", async () => {
    providerBehaviour = {};
    const first = await request(app).post("/api/chat").set(auth()).send({ message: "What should I learn first?", goalId });
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ provider: "gemini", generatedBy: "ai" });
    expect(first.body.data.reply.content).toBe("Reply from gemini");

    providerBehaviour = { gemini: "fail" };
    const second = await request(app).post("/api/chat").set(auth()).send({ message: "And scholarships?", goalId });
    expect(second.body.data.provider).toBe("groq");

    providerBehaviour = { gemini: "fail", groq: "fail" };
    const third = await request(app).post("/api/chat").set(auth()).send({ message: "Any programmes?", goalId });
    expect(third.body.data.provider).toBe("openrouter");

    // Every provider down: the assistant still answers from the user's own saved data.
    providerBehaviour = { gemini: "fail", groq: "fail", openrouter: "fail" };
    const offline = await request(app).post("/api/chat").set(auth()).send({ message: "Show my roadmap next steps", goalId });
    expect(offline.status).toBe(200);
    expect(offline.body.data).toMatchObject({ provider: "fallback", generatedBy: "template" });
    expect(offline.body.data.reply.content).toMatch(/roadmap/i);
    providerBehaviour = {};

    const history = await request(app).get("/api/chat/history").set(auth());
    expect(history.body.data.length).toBe(8);
    expect(history.body.data[0].role).toBe("user");

    expect((await request(app).post("/api/chat").set(auth()).send({ message: "   " })).status).toBe(400);
    expect((await request(app).post("/api/chat").set(auth()).send({ message: "x".repeat(1001) })).status).toBe(400);
    expect((await request(app).post("/api/chat").send({ message: "hi" })).status).toBe(401);
  });

  it("gives career guidance and skill recommendations", async () => {
    const res = await request(app).post(`/api/goals/${goalId}/guidance`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.guidance).toBeTruthy();
    expect(Array.isArray(res.body.data.skillRecommendations)).toBe(true);
    expect(["ai", "template"]).toContain(res.body.data.generatedBy);

    providerBehaviour = { gemini: "fail", groq: "fail", openrouter: "fail" };
    const offline = await request(app).post(`/api/goals/${goalId}/guidance`).set(auth());
    expect(offline.status).toBe(200);
    expect(offline.body.data.generatedBy).toBe("template");
    providerBehaviour = {};
  });

  it("keeps all data after logout and a fresh login", async () => {
    expect((await request(app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
    // The old refresh token is dead after logout.
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookie)).status).toBe(401);

    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    token = res.body.data.accessToken;
    const roadmap = await request(app).get(`/api/goals/${goalId}/roadmap`).set(auth());
    expect(roadmap.body.data.roadmap.steps.find((s: { id: string }) => s.id === stepId).status).toBe("DONE");
    expect(roadmap.body.data.roadmap.progress).toBeGreaterThan(0);
    const goals = await request(app).get("/api/goals").set(auth());
    expect(goals.body.data[0].progress).toBeGreaterThan(0);
    expect((await request(app).get("/api/chat/history").set(auth())).body.data.length).toBeGreaterThan(0);
  });

  it("resets a forgotten password end to end", async () => {
    const before = sent.length;
    const sessionBeforeReset = (await login(user.email, user.password)).headers["set-cookie"] as unknown as string[];
    const ask = await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    expect(ask.status).toBe(202);
    const mail = sent.slice(before).find((m) => m.type === "reset" && m.to === user.email);
    expect(mail).toBeTruthy();

    // Unknown address gives the same response and sends nothing.
    const count = sent.length;
    expect((await request(app).post("/api/auth/forgot-password").send({ email: `nobody${unique}@example.com` })).status).toBe(202);
    expect(sent.length).toBe(count);

    const newPassword = "NewJourney@5678!";
    expect((await request(app).post("/api/auth/reset-password").send({ token: "bogus-token", password: newPassword })).status).toBe(400);
    const reset = await request(app).post("/api/auth/reset-password").send({ token: mail?.token, password: newPassword });
    expect(reset.status).toBe(200);
    // Single use.
    expect((await request(app).post("/api/auth/reset-password").send({ token: mail?.token, password: "Another@9999!" })).status).toBe(400);

    // Reset ends every existing session immediately, even inside the refresh-reuse grace window.
    expect((await request(app).post("/api/auth/refresh").set("Cookie", sessionBeforeReset)).status).toBe(401);
    expect((await login(user.email, user.password)).status).toBe(401);
    const ok = await login(user.email, newPassword);
    expect(ok.status).toBe(200);
    token = ok.body.data.accessToken;
  });

  it("redirects nothing but rejects every private API without a token", async () => {
    for (const path of ["/api/profile", "/api/goals", "/api/chat/history", "/api/auth/me", "/api/admin/monitoring"]) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    expect((await request(app).get("/api/admin/monitoring").set(auth())).status).toBe(403);
  });

  it("shows administrators the monitoring dashboard data", async () => {
    const admin = await login("admin@hdos.local", "DemoPass123");
    const adminToken = admin.body.data.accessToken as string;
    const res = await request(app).get("/api/admin/monitoring").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(["online", "degraded", "offline"]).toContain(d.system.status);
    expect(d.database.status).toBe("online");
    expect(d.totals.users).toBeGreaterThan(0);
    expect(d.totals.roadmaps).toBeGreaterThan(0);
    expect(d.totals.recommendations).toBeGreaterThan(0);
    expect(d.ai.providers.map((p: { id: string }) => p.id)).toEqual(["gemini", "groq", "openrouter"]);
    expect(d.ai.requestsTotal).toBeGreaterThan(0);
    expect(d.services.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(["API server", "Database", "AI providers"]));

    const probe = await request(app).post("/api/admin/monitoring/ai-probe").set("Authorization", `Bearer ${adminToken}`);
    expect(probe.status).toBe(200);
    expect(probe.body.data.providers).toHaveLength(3);
  });

  it("deletes the account together with chat history", async () => {
    const res = await request(app).delete("/api/account").set(auth()).send({ password: "NewJourney@5678!" });
    expect(res.status).toBe(204);
  });
});
