import { test } from "node:test";
import assert from "node:assert/strict";
import { isTrackedPath, scrubEvent, scrubUrl } from "./privacy.ts";

const ID = "3f2b8c1e-9a4d-4c7b-8e2f-1a2b3c4d5e6f";

test("site public et tableau de bord kiné mesurés", () => {
  for (const p of ["/", "/praticiens", "/signup", "/dashboard", "/dashboard/patients", `/dashboard/patients/${ID}`]) {
    assert.equal(isTrackedPath(p), true, p);
  }
});

test("espace patient, documents, admin, invitations, API : jamais", () => {
  for (const p of ["/patient", "/patient/historique", "/documents/honoraires", "/admin", "/invitation/abc", "/api/x", "/apres-connexion", "/dashboardx"]) {
    assert.equal(isTrackedPath(p), false, p);
  }
});

test("adresse : identifiant remplacé, paramètres et ancre retirés", () => {
  assert.equal(
    scrubUrl(`https://easyphysio.fr/dashboard/patients/${ID}?tab=messages&email=a@b.fr#x`),
    "https://easyphysio.fr/dashboard/patients/:id",
  );
  assert.equal(scrubUrl(`https://easyphysio.fr/patient/historique/${ID}`), "https://easyphysio.fr/");
});

test("événement d'une page patient : pas envoyé", () => {
  assert.equal(scrubEvent({ properties: {} }, "/patient"), null);
});

test("événement kiné : titre et texte retirés, liens nettoyés", () => {
  const e = scrubEvent(
    {
      properties: {
        $current_url: `https://easyphysio.fr/dashboard/patients/${ID}`,
        $pathname: `/dashboard/patients/${ID}`,
        $referrer: "https://easyphysio.fr/patient/messages",
        title: "Marie Dupont — EasyPhysio",
        $el_text: "Marie Dupont",
        $elements_chain: `a:href="/dashboard/patients/${ID}"attr__href="mailto:marie@exemple.fr"`,
      },
    },
    `/dashboard/patients/${ID}`,
  )!;
  const p = e.properties!;
  assert.equal(p.$current_url, "https://easyphysio.fr/dashboard/patients/:id");
  assert.equal(p.$pathname, "/dashboard/patients/:id");
  assert.equal(p.$referrer, "https://easyphysio.fr/");
  assert.equal(p.title, undefined);
  assert.equal(p.$el_text, undefined);
  assert.ok(!String(p.$elements_chain).includes(ID));
  assert.ok(!String(p.$elements_chain).includes("marie@"));
});
