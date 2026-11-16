import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWebPushToken, webPushToken } from "./webToken.ts";

const sub = {
  endpoint: "https://web.push.apple.com/QGx2y3Zabcdefghijklmnop",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
};

test("un abonnement valide donne toujours le même jeton, et se relit", () => {
  const reordered = { keys: { auth: sub.keys.auth, p256dh: sub.keys.p256dh }, endpoint: sub.endpoint };
  assert.equal(webPushToken(sub), webPushToken(reordered));
  assert.deepEqual(parseWebPushToken(webPushToken(sub)), sub);
  assert.deepEqual(parseWebPushToken(sub), sub);
});

test("refuse les abonnements invalides et les jetons de l'appli mobile", () => {
  assert.equal(parseWebPushToken("ExponentPushToken[abcdefghijklmnop]"), null);
  assert.equal(parseWebPushToken({ ...sub, endpoint: "http://insecure.example/x1234567890" }), null);
  assert.equal(parseWebPushToken({ ...sub, endpoint: "javascript:alert(1)" }), null);
  assert.equal(parseWebPushToken({ endpoint: sub.endpoint }), null);
  assert.equal(parseWebPushToken({ ...sub, keys: { p256dh: "pas une clé !", auth: sub.keys.auth } }), null);
  assert.equal(parseWebPushToken("{pas du json"), null);
  assert.equal(parseWebPushToken(null), null);
});

test("le jeton tient dans la limite de la base (1000 caractères)", () => {
  const long = { ...sub, endpoint: `https://fcm.googleapis.com/fcm/send/${"a".repeat(500)}` };
  assert.ok(webPushToken(long).length < 1000);
});
