import { test } from "node:test";
import assert from "node:assert/strict";
import { libTranslator, intlTag } from "./translator.ts";
import { localeFromAcceptLanguage as guess } from "../../i18n/locales.ts";

const fr = { a: { hi: "Bonjour {name}", only: "Seulement FR", n: "{count, plural, one {# séance} other {# séances}}" } };
const en = { a: { hi: "Hello {name}", n: "{count, plural, one {# session} other {# sessions}}" } };

test("libTranslator : français par défaut", () => assert.equal(libTranslator(undefined, { fr, en }, "a")("hi", { name: "Léa" }), "Bonjour Léa"));
test("libTranslator : anglais + pluriel", () => assert.equal(libTranslator("en", { fr, en }, "a")("n", { count: 2 }), "2 sessions"));
test("libTranslator : clé absente en anglais → français", () => assert.equal(libTranslator("en", { fr, en }, "a")("only"), "Seulement FR"));
test("intlTag", () => assert.equal(intlTag("en"), "en-GB"));

test("langue du navigateur : français", () => assert.equal(guess("fr-BE,fr;q=0.9,en;q=0.8"), "fr"));
test("langue du navigateur : anglais", () => assert.equal(guess("en-GB,en;q=0.9"), "en"));
test("langue du navigateur : allemand → anglais", () => assert.equal(guess("de-CH,de;q=0.9"), "en"));
test("langue du navigateur : néerlandais puis anglais → anglais", () => assert.equal(guess("nl-BE,nl;q=0.9,en;q=0.5"), "en"));
test("langue du navigateur : rien → français", () => assert.equal(guess(null), "fr"));
