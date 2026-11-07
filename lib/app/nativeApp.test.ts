import { test } from "node:test";
import assert from "node:assert/strict";
import { isAppPath, nativePlatformFromUserAgent } from "./nativeApp.ts";

test("reconnaît l'appli iPhone et Android", () => {
  const base = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  assert.equal(nativePlatformFromUserAgent(`${base} EasyPhysioApp/1.0.0 (ios)`), "ios");
  assert.equal(nativePlatformFromUserAgent(`Mozilla/5.0 (Linux; Android 16) EasyPhysioApp/1.2.3 (android)`), "android");
});

test("un navigateur ordinaire n'est pas l'appli", () => {
  assert.equal(nativePlatformFromUserAgent("Mozilla/5.0 (iPhone) Safari/604.1"), null);
  assert.equal(nativePlatformFromUserAgent(null), null);
  assert.equal(nativePlatformFromUserAgent("EasyPhysioApp/1.0.0 (windows)"), null);
});

test("pages gardées dans l'appli, vitrine renvoyée vers l'espace", () => {
  assert.equal(isAppPath("/patient"), true);
  assert.equal(isAppPath("/patient/messages"), true);
  assert.equal(isAppPath("/dashboard/patients/abc"), true);
  assert.equal(isAppPath("/rejoindre/xyz"), true);
  assert.equal(isAppPath("/"), false);
  assert.equal(isAppPath("/demo"), false);
  assert.equal(isAppPath("/patientele"), false);
});
