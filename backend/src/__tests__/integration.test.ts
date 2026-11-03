// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// End-to-end API test against a real PostgreSQL database with the seed applied.
// Skipped unless TEST_DATABASE_URL is set (CI provides it; see .github/workflows/ci.yml).
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const suite = url ? describe : describe.skip;

suite("API integration", () => {
  let app: import("express").Application;
  const unique = Date.now();
  const alice = { email: `alice${unique}@example.com`, password: "Passw0rdAlice", name: "Alice Test", role: "STUDENT" };
  const bob = { email: `bob${unique}@example.com`, password: "Passw0rdBobby", name: "Bob Test", role: "GRADUATE" };
  let aliceToken = "";
  let aliceCookie: string[] = [];
  let bobToken = "";
  let goalId = "";

  const login = async (u: { email: string; password: string }) => {
    const res = await request(app).post("/api/auth/login").send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    return { token: res.body.data.accessToken as string, cookie: res.headers["set-cookie"] as unknown as string[] };
  };

  beforeAll(async () => {
    const { createApp } = await import("../app");
    app = createApp();
    for (const u of [alice, bob]) {
      const res = await request(app).post("/api/auth/register").send(u);
      expect(res.status).toBe(201);
    }
    ({ token: aliceToken, cookie: aliceCookie } = await login(alice));
    ({ token: bobToken } = await login(bob));
  });

  it("reports health with a live database", async () => {
    const res = await request(app).get("/health");
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("serves real, sourced national data", async () => {
    const res = await request(app).get("/api/insights/districts");
    expect(res.body.data.districts).toHaveLength(30);
    const total = res.body.data.districts.reduce((s: number, d: { population: number }) => s + d.population, 0);
    expect(total).toBe(13_246_394);
    expect(res.body.data.source.isDemo).toBe(false);

    const nat = await request(app).get("/api/insights/national");
    const unemployment = nat.body.data.indicators.find((i: { code: string }) => i.code === "LFS_UNEMPLOYMENT_RATE_Q4_2024");
    expect(unemployment.value).toBe(14.7);
    expect(unemployment.source.publisher).toMatch(/NISR|Statistics/);
  });

  it("rejects duplicate registration, weak passwords and privileged self-registration", async () => {
    expect((await request(app).post("/api/auth/register").send(alice)).body.error.code).toBe("EMAIL_TAKEN");
    const weak = await request(app).post("/api/auth/register").send({ email: "x@example.com", password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe("VALIDATION_ERROR");
    const admin = await request(app).post("/api/auth/register").send({ email: `evil${unique}@example.com`, password: "Passw0rdEvil1", role: "ADMINISTRATOR" });
    expect(admin.status).toBe(400);
  });

  it("rejects bad credentials with a generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: alice.email, password: "WrongPass123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("protects private routes", async () => {
    expect((await request(app).get("/api/goals")).status).toBe(401);
    expect((await request(app).get("/api/goals").set("Authorization", "Bearer garbage")).body.error.code).toBe("INVALID_TOKEN");
  });

  it("rotates refresh tokens and detects replay of a stale one", async () => {
    const first = await request(app).post("/api/auth/refresh").set("Cookie", aliceCookie);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toBeTruthy();
    const rotated = first.headers["set-cookie"] as unknown as string[];
    expect(rotated[0]).toMatch(/HttpOnly/i);
    expect((await request(app).post("/api/auth/refresh")).status).toBe(401);
    aliceCookie = rotated;
  });

  it("saves a profile and computes completeness", async () => {
    const skills = (await request(app).get("/api/catalog/skills?q=Programming")).body.data;
    const sectors = (await request(app).get("/api/catalog/sectors")).body.data;
    const districts = (await request(app).get("/api/catalog/districts")).body.data;
    const res = await request(app)
      .put("/api/profile")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        educationLevel: "UPPER_SECONDARY",
        districtId: districts.find((d: { name: string }) => d.name === "Huye").id,
        skills: [{ skillId: skills[0].id, level: 2 }],
        sectorIds: [sectors.find((s: { code: string }) => s.code === "ICT").id],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.completeness).toBeGreaterThanOrEqual(55);
    expect(res.body.data.profile.districtName).toBe("Huye");
  });

  it("rejects unknown ids in a profile", async () => {
    const res = await request(app).put("/api/profile").set("Authorization", `Bearer ${aliceToken}`)
      .send({ educationLevel: "DIPLOMA", skills: [{ skillId: "nope", level: 3 }], sectorIds: [] });
    expect(res.status).toBe(400);
  });

  it("creates a goal, recommends, builds a roadmap and tracks progress", async () => {
    const occ = (await request(app).get("/api/catalog/occupations?q=Software")).body.data[0];
    const created = await request(app).post("/api/goals").set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "Become a software developer", category: "CAREER", targetOccupationId: occ.id });
    expect(created.status).toBe(201);
    goalId = created.body.data.id;
    expect(created.body.data.progress).toBeNull();

    const rec = await request(app).get(`/api/goals/${goalId}/recommendations`).set("Authorization", `Bearer ${aliceToken}`);
    expect(rec.status).toBe(200);
    const top = rec.body.data.occupations[0];
    expect(top.occupation.title).toBe("Software Developer");
    expect(top.fitScore).toBeGreaterThan(0);
    expect(top.missingSkills.length).toBeGreaterThan(0);
    expect(top.confidence).not.toBe("HIGH"); // demo-sourced occupation data caps confidence
    expect(rec.body.data.programs.length).toBeGreaterThan(0);
    expect(rec.body.data.disclaimer).toBeTruthy();

    const gen = await request(app).post(`/api/goals/${goalId}/roadmap`).set("Authorization", `Bearer ${aliceToken}`);
    expect(gen.status).toBe(200);
    const { steps } = gen.body.data.roadmap;
    expect(steps.length).toBeGreaterThan(3);

    const upd = await request(app).patch(`/api/goals/${goalId}/roadmap/steps/${steps[0].id}`)
      .set("Authorization", `Bearer ${aliceToken}`).send({ status: "DONE" });
    expect(upd.body.data.progress).toBeGreaterThan(0);

    // Regeneration keeps the user's progress.
    const regen = await request(app).post(`/api/goals/${goalId}/roadmap`).set("Authorization", `Bearer ${aliceToken}`);
    expect(regen.body.data.roadmap.steps.some((s: { status: string }) => s.status === "DONE")).toBe(true);

    const explain = await request(app).post(`/api/goals/${goalId}/explain`).set("Authorization", `Bearer ${aliceToken}`);
    expect(explain.status).toBe(200);
    expect(explain.body.data.text).toContain("Software Developer");
  });

  it("prevents users from touching each other's goals", async () => {
    for (const path of [`/api/goals/${goalId}`, `/api/goals/${goalId}/recommendations`, `/api/goals/${goalId}/roadmap`]) {
      expect((await request(app).get(path).set("Authorization", `Bearer ${bobToken}`)).status).toBe(404);
    }
    expect((await request(app).delete(`/api/goals/${goalId}`).set("Authorization", `Bearer ${bobToken}`)).status).toBe(404);
    expect((await request(app).get("/api/goals").set("Authorization", `Bearer ${bobToken}`)).body.data).toEqual([]);
  });

  it("blocks ordinary users from analytics and admin routes", async () => {
    for (const path of ["/api/analytics/overview", "/api/admin/users", "/api/admin/audit-log"]) {
      expect((await request(app).get(path).set("Authorization", `Bearer ${aliceToken}`)).status).toBe(403);
    }
  });

  it("suppresses small cohorts for government analysts", async () => {
    const { token } = await login({ email: "analyst@hdos.local", password: "DemoPass123" });
    const res = await request(app).get("/api/analytics/overview").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const roles: { count: number | null; suppressed: boolean }[] = res.body.data.usersByRole;
    expect(roles.every((c) => (c.suppressed ? c.count === null : (c.count as number) >= res.body.data.minimumCohort))).toBe(true);
  });

  it("lets an administrator change roles, with audit and no self-demotion", async () => {
    const { token } = await login({ email: "admin@hdos.local", password: "DemoPass123" });
    const users = await request(app).get("/api/admin/users?pageSize=50").set("Authorization", `Bearer ${token}`);
    const target = users.body.data.find((u: { email: string }) => u.email === bob.email);
    const res = await request(app).patch(`/api/admin/users/${target.id}/role`).set("Authorization", `Bearer ${token}`).send({ role: "ENTREPRENEUR" });
    expect(res.body.data.role).toBe("ENTREPRENEUR");
    const self = users.body.data.find((u: { email: string }) => u.email === "admin@hdos.local");
    expect((await request(app).patch(`/api/admin/users/${self.id}/role`).set("Authorization", `Bearer ${token}`).send({ role: "STUDENT" })).status).toBe(400);
    const log = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${token}`);
    expect(log.body.data.some((e: { action: string }) => e.action === "admin.role_changed")).toBe(true);
  });

  it("deletes an account and all its data on request", async () => {
    const wrong = await request(app).delete("/api/account").set("Authorization", `Bearer ${aliceToken}`).send({ password: "WrongPass123" });
    expect(wrong.status).toBe(403);
    const ok = await request(app).delete("/api/account").set("Authorization", `Bearer ${aliceToken}`).send({ password: alice.password });
    expect(ok.status).toBe(204);
    expect((await request(app).post("/api/auth/login").send({ email: alice.email, password: alice.password })).status).toBe(401);
  });
});
