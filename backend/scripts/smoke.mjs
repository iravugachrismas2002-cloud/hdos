// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
// Post-deploy smoke test: walks the whole user journey over HTTP against a running deployment.
//
//   SMOKE_BASE_URL=https://your-web-url SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='...' node scripts/smoke.mjs
//
// Point SMOKE_BASE_URL at the WEB app (not the API) so the /api rewrite and the refresh cookie are tested too.
// The account is created if it does not exist (it must already be e-mail verified when verification is required).
const base = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
if (!email || !password) {
  console.error("Set SMOKE_EMAIL and SMOKE_PASSWORD");
  process.exit(2);
}

let cookie = "";
let token = "";
let failures = 0;

const call = async (method, path, body, { auth = true } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.getSetCookie?.() ?? [];
  const rt = set.find((c) => c.startsWith("hdos_rt="));
  if (rt) cookie = rt.split(";")[0];
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
};

const step = async (name, fn) => {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? `  (${detail})` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${name}  -> ${error.message}`);
  }
};
const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

let goalId = "";
let stepId = "";

await step("health", async () => {
  const res = await fetch(`${base}/api/catalog/sectors`);
  expect(res.ok, `catalog status ${res.status}`);
});

await step("register (or already exists)", async () => {
  const r = await call("POST", "/auth/register", { email, password, name: "Smoke Tester", role: "STUDENT" }, { auth: false });
  expect(r.status === 201 || r.json?.error?.code === "EMAIL_TAKEN", `status ${r.status} ${r.json?.error?.code}`);
  return r.status === 201 ? "created" : "existing";
});

await step("login", async () => {
  const r = await call("POST", "/auth/login", { email, password }, { auth: false });
  expect(r.status === 200, `status ${r.status} ${r.json?.error?.code ?? ""}`);
  token = r.json.data.accessToken;
  expect(cookie.startsWith("hdos_rt="), "refresh cookie not set");
});

await step("session persistence (refresh cookie)", async () => {
  const r = await call("POST", "/auth/refresh", undefined, { auth: false });
  expect(r.status === 200, `status ${r.status}`);
  token = r.json.data.accessToken;
  const me = await call("GET", "/auth/me");
  expect(me.json?.data?.user?.email === email.toLowerCase(), "wrong user");
});

await step("protected route without token is rejected", async () => {
  const saved = token;
  token = "";
  const r = await call("GET", "/goals");
  token = saved;
  expect(r.status === 401, `status ${r.status}`);
});

await step("complete profile", async () => {
  const skills = (await call("GET", "/catalog/skills?q=Programming", undefined, { auth: false })).json.data;
  const sectors = (await call("GET", "/catalog/sectors", undefined, { auth: false })).json.data;
  const districts = (await call("GET", "/catalog/districts", undefined, { auth: false })).json.data;
  const r = await call("PUT", "/profile", {
    educationLevel: "UPPER_SECONDARY",
    districtId: districts.find((d) => d.name === "Kicukiro")?.id ?? districts[0].id,
    skills: skills.slice(0, 2).map((s) => ({ skillId: s.id, level: 2 })),
    sectorIds: [sectors.find((s) => s.code === "ICT")?.id ?? sectors[0].id],
    bio: "Smoke test profile",
  });
  expect(r.status === 200, `status ${r.status} ${JSON.stringify(r.json?.error ?? "")}`);
  return `completeness ${r.json.data.profile.completeness}%`;
});

await step("select goal", async () => {
  const occ = (await call("GET", "/catalog/occupations?q=Software", undefined, { auth: false })).json.data[0];
  expect(occ, "no 'Software' occupation seeded");
  const r = await call("POST", "/goals", { title: `Smoke goal ${Date.now()}`, category: "CAREER", targetOccupationId: occ.id });
  expect(r.status === 201, `status ${r.status} ${JSON.stringify(r.json?.error ?? "")}`);
  goalId = r.json.data.id;
});

await step("recommendations", async () => {
  const r = await call("GET", `/goals/${goalId}/recommendations`);
  expect(r.status === 200, `status ${r.status}`);
  const d = r.json.data;
  expect(d.occupations.length > 0 && d.programs.length > 0, "empty recommendations");
  return `${d.occupations.length} occupations, ${d.programs.length} programmes, ${d.opportunities.length} opportunities`;
});

await step("roadmap generation", async () => {
  const r = await call("POST", `/goals/${goalId}/roadmap`);
  expect(r.status === 200, `status ${r.status} ${JSON.stringify(r.json?.error ?? "")}`);
  stepId = r.json.data.roadmap.steps[0].id;
  return `${r.json.data.roadmap.steps.length} steps`;
});

await step("opportunities", async () => {
  const r = await call("GET", "/catalog/opportunities?pageSize=5", undefined, { auth: false });
  expect(r.status === 200 && r.json.meta.total > 0, "no opportunities");
  return `${r.json.meta.total} total`;
});

await step("AI chatbot", async () => {
  const r = await call("POST", "/chat", { message: "What skills should I learn first for my goal?", goalId });
  expect(r.status === 200, `status ${r.status} ${JSON.stringify(r.json?.error ?? "")}`);
  expect(r.json.data.reply.content.length > 10, "empty reply");
  return `answered by ${r.json.data.provider}`;
});

await step("career guidance & skills", async () => {
  const r = await call("POST", `/goals/${goalId}/guidance`);
  expect(r.status === 200 && r.json.data.guidance.length > 10, `status ${r.status}`);
  return `answered by ${r.json.data.provider}`;
});

await step("save progress", async () => {
  const r = await call("PATCH", `/goals/${goalId}/roadmap/steps/${stepId}`, { status: "DONE" });
  expect(r.status === 200 && r.json.data.progress > 0, `status ${r.status}`);
});

await step("forgot password responds without revealing accounts", async () => {
  const r = await call("POST", "/auth/forgot-password", { email }, { auth: false });
  expect(r.status === 202 || r.status === 200, `status ${r.status}`);
});

await step("logout", async () => {
  const r = await call("POST", "/auth/logout", undefined, { auth: false });
  expect(r.status === 204, `status ${r.status}`);
  const again = await call("POST", "/auth/refresh", undefined, { auth: false });
  expect(again.status === 401, `refresh after logout returned ${again.status}`);
  token = "";
  cookie = "";
});

await step("login again and find saved progress", async () => {
  const r = await call("POST", "/auth/login", { email, password }, { auth: false });
  expect(r.status === 200, `status ${r.status}`);
  token = r.json.data.accessToken;
  const rm = await call("GET", `/goals/${goalId}/roadmap`);
  expect(rm.json.data.roadmap.steps.find((s) => s.id === stepId)?.status === "DONE", "progress not saved");
  const hist = await call("GET", "/chat/history");
  expect(hist.json.data.length > 0, "chat history not saved");
});

console.log(failures === 0 ? "\nALL STEPS PASSED" : `\n${failures} STEP(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
