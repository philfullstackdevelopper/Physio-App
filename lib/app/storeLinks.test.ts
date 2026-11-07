import { test } from "node:test";
import assert from "node:assert/strict";
import { appStoreId, phoneFromUserAgent, storeLinks } from "./storeLinks.ts";

test("adresses des magasins : absentes tant qu'elles ne sont pas renseignées", () => {
  delete process.env.APP_STORE_URL;
  process.env.PLAY_STORE_URL = "pas une adresse";
  assert.deepEqual(storeLinks(), { ios: null, android: null });
  process.env.APP_STORE_URL = " https://apps.apple.com/fr/app/easyphysio/id1234567890 ";
  process.env.PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=fr.easyphysio.app";
  assert.deepEqual(storeLinks(), {
    ios: "https://apps.apple.com/fr/app/easyphysio/id1234567890",
    android: "https://play.google.com/store/apps/details?id=fr.easyphysio.app",
  });
  delete process.env.APP_STORE_URL;
  delete process.env.PLAY_STORE_URL;
});

test("identifiant Apple tiré de l'adresse App Store", () => {
  assert.equal(appStoreId("https://apps.apple.com/fr/app/easyphysio/id1234567890"), "1234567890");
  assert.equal(appStoreId(null), null);
});

test("bon magasin selon le téléphone", () => {
  assert.equal(phoneFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)"), "ios");
  assert.equal(phoneFromUserAgent("Mozilla/5.0 (Linux; Android 16; Pixel 9)"), "android");
  assert.equal(phoneFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), null);
});
