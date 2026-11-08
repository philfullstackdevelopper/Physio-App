import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, createRateLimiter } from "./rateLimit.ts";

test("permet N essais par fenêtre, puis refuse, puis repart à zéro", () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
  assert.equal(rl.allow("a", 0), true);
  assert.equal(rl.allow("a", 10), true);
  assert.equal(rl.allow("a", 20), true);
  assert.equal(rl.allow("a", 30), false);
  assert.equal(rl.allow("b", 30), true);
  assert.equal(rl.allow("a", 1000), true);
});

test("mémoire bornée", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 }, 2);
  assert.equal(rl.allow("a", 0), true);
  assert.equal(rl.allow("b", 0), true);
  assert.equal(rl.allow("c", 0), true);
  // « a » a été oublié pour faire de la place.
  assert.equal(rl.allow("a", 0), true);
});

test("lit la première IP de x-forwarded-for", () => {
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });
  assert.equal(clientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(h({})), "inconnue");
});
