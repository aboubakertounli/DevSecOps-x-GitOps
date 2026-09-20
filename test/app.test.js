import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { createApp } from "../src/app.js";
import { reset } from "../src/store.js";

let server;
let base;

before(async () => {
  server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
);

beforeEach(() => {
  reset();
});

test("health and readiness probes succeed", async () => {
  const health = await fetch(`${base}/healthz`);
  const ready = await fetch(`${base}/readyz`);
  assert.equal(health.status, 200);
  assert.equal(ready.status, 200);
  assert.equal((await health.json()).status, "ok");
});

test("CRUD round-trip on /items", async () => {
  const created = await fetch(`${base}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "widget" }),
  });
  assert.equal(created.status, 201);
  const item = await created.json();
  assert.equal(item.name, "widget");

  const listed = await fetch(`${base}/items`);
  assert.equal((await listed.json()).length, 1);

  const updated = await fetch(`${base}/items/${item.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "gadget" }),
  });
  assert.equal((await updated.json()).name, "gadget");

  const deleted = await fetch(`${base}/items/${item.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
});

test("rejects items without a name", async () => {
  const res = await fetch(`${base}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test("exposes Prometheus metrics", async () => {
  await fetch(`${base}/healthz`);
  const res = await fetch(`${base}/metrics`);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.match(body, /http_requests_total/);
  assert.match(body, /http_request_duration_seconds/);
});
