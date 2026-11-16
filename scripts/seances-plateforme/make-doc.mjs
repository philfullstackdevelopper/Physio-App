// Écrit docs/seances-a-valider-jules.md à partir du programme appliqué par 0096.
import fs from "node:fs";
import path from "node:path";
import { PLAN, parseDose } from "./plan-seances.mjs";
const repo = process.argv[2];
const fr = JSON.parse(fs.readFileSync(path.join(repo, "i18n/content/fr-exercise-names.json"), "utf8"));
const STAGES = [
  ["acute", "Phase 1 — Soulagement"],
  ["subacute", "Phase 2 — Mobilité"],
  ["recovery", "Phase 3 — Renforcement"],
  ["return_to_sport", "Phase 4 — Reprise"],
];
const missing = new Set();
const dose = (d) => {
  if (/min$/.test(d)) return d.replace(/^1x/, "") .replace("min", " min");
  const x = parseDose(d);
  return x.hold ? `${x.sets} × ${x.hold} s` : `${x.sets} × ${x.reps}`;
};
const name = (en) => {
  if (!fr[en]) missing.add(en);
  return fr[en] ?? en;
};
const conds = Object.keys(PLAN).sort((a, b) => a.localeCompare(b, "fr"));
let md = `# Séances de la plateforme — à valider par Jules

*Mis à jour le 17 novembre 2026 (migration 0096, en ligne).*

## Ce qui a été fait

- **${conds.length} pathologies**, chacune avec ses **4 phases** (Soulagement, Mobilité, Renforcement, Reprise) : ${conds.length * 4} séances, plus 5 séances libres (Lombalgie chronique : express / complète / intensive ; Entorse de la cheville : mobilité / renforcement).
- Chaque séance contient **5 à 6 exercices**, tous **filmés** (vidéo de Jules ou vidéo IA validée par Philippe) ou des activités du quotidien (marche, vélo, course, escaliers, corde à sauter).
- Chaque exercice a un **dosage** (séries × répétitions, ou séries × tenue en secondes). Pour les activités d'endurance, la durée vient de la consigne de l'exercice.
- Les 21 pathologies créées en double (même nom) ont été fusionnées : chaque nom n'apparaît plus qu'une fois dans le sélecteur.
- 13 pathologies n'avaient aucune séance (capsulite, coiffe, prothèse d'épaule, fractures, rhizarthrose, De Quervain, torticolis…) : elles ont maintenant leurs 4 phases.
- Le kiné garde la main : il peut toujours ajuster la séance d'un patient (« Ajuster la séance »).

## Ce que Jules doit vérifier

Ce programme a été **rédigé par Claude** à partir de la pratique courante, avec uniquement les exercices filmés. **Rien n'est validé cliniquement.** Pour chaque séance, cocher ou corriger :

1. Les exercices sont-ils adaptés à la pathologie **et** à la phase (pas trop tôt, pas trop dur) ?
2. Le dosage est-il raisonnable ?
3. Manque-t-il un exercice indispensable (à filmer en priorité) ?

Points d'attention particuliers :
- **Post-opératoire** (prothèses, réparation de la coiffe, ligament croisé, tendon d'Achille) : les phases 1–2 doivent respecter les protocoles du chirurgien.
- **Main / poignet** (rhizarthrose, De Quervain, fractures et entorse du poignet, canal carpien) : peu d'exercices filmés pour la main — la priorité de tournage est probablement là.
- **Sauts** (phase 4 de la cheville, du genou, du mollet) : à valider avant de les proposer.

---
`;
for (const c of conds) {
  md += `\n## ${c}\n\n| Phase | Exercices (dosage) | OK ? |\n|---|---|---|\n`;
  for (const [s, label] of STAGES) {
    const list = PLAN[c][s].map((x) => {
      const [en, d] = x.split("|");
      return `${name(en)} (${dose(d)})`;
    });
    md += `| ${label} | ${list.join(" · ")} | ☐ |\n`;
  }
}
fs.writeFileSync(path.join(repo, "docs/seances-a-valider-jules.md"), md);
console.log("doc écrite,", conds.length, "pathologies ; sans nom français :", [...missing]);
