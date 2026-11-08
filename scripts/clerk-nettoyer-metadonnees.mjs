// =============================================================================
// Nettoyage des comptes Clerk (audit HDS, 2026-11-08).
//
// Clerk est hébergé aux USA et n'est pas certifié HDS. Il ne doit pas savoir
// qu'une personne est suivie par un kiné. Jusqu'ici, chaque invitation patient
// enregistrait chez Clerk « role: patient » et le nom du kiné. Le code ne les
// envoie plus ; ce script retire ceux déjà enregistrés sur les comptes
// existants. Les comptes de test créés depuis /admin (test_account: true)
// ne sont pas touchés : ce sont de faux patients.
//
// Par défaut, il ne fait que COMPTER (aucune modification) et n'affiche
// aucun nom ni aucune adresse e-mail. Avec --apply, il réécrit les
// métadonnées publiques de chaque compte concerné en ne gardant que
// « full_name ».
//
// Les invitations encore en attente ne peuvent pas être modifiées chez Clerk :
// le script les compte seulement. Pour les nettoyer, le kiné renvoie
// l'invitation (le code actuel en crée une propre) ou on la révoque.
//
// Lancement, avec la clé de PRODUCTION (sur le serveur Scalingo, une fois ce
// script mis en ligne) :
//   scalingo --region osc-fr1 --app easyphysio run node scripts/clerk-nettoyer-metadonnees.mjs
//   scalingo --region osc-fr1 --app easyphysio run node scripts/clerk-nettoyer-metadonnees.mjs --apply
// En local, .env.local contient la clé de DÉVELOPPEMENT :
//   node --env-file=.env.local scripts/clerk-nettoyer-metadonnees.mjs
// =============================================================================
import { createClerkClient } from "@clerk/backend";

const APPLY = process.argv.includes("--apply");
const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("Il manque CLERK_SECRET_KEY.");
  process.exit(1);
}
const instance = secretKey.startsWith("sk_live_") ? "PRODUCTION" : "développement";
const clerk = createClerkClient({ secretKey });

const SENSITIVE_KEYS = ["role", "instructor_name"];
const hasSensitive = (meta) => meta && SENSITIVE_KEYS.some((k) => k in meta);

async function listAll(fetchPage) {
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const page = await fetchPage({ limit: 100, offset });
    const items = Array.isArray(page) ? page : page.data;
    all.push(...items);
    if (items.length < 100) return all;
  }
}

const users = await listAll((p) => clerk.users.getUserList(p));
const toClean = users.filter((u) => hasSensitive(u.publicMetadata) && !u.publicMetadata?.test_account);
const testAccounts = users.filter((u) => u.publicMetadata?.test_account).length;

const invitations = await listAll((p) => clerk.invitations.getInvitationList({ ...p, status: "pending" }));
const pendingSensitive = invitations.filter((i) => hasSensitive(i.publicMetadata)).length;

console.log(`Instance Clerk : ${instance}`);
console.log(`Comptes au total : ${users.length} (dont ${testAccounts} comptes de test, laissés tels quels)`);
console.log(`Comptes avec « role » ou nom du kiné à retirer : ${toClean.length}`);
console.log(`Invitations en attente qui en contiennent : ${pendingSensitive} (non modifiables, voir l'en-tête du script)`);

if (!APPLY) {
  console.log("\nAucune modification faite. Relancez avec --apply pour nettoyer.");
  process.exit(0);
}

let done = 0;
let failed = 0;
for (const u of toClean) {
  const kept = {};
  if (u.publicMetadata?.full_name) kept.full_name = u.publicMetadata.full_name;
  try {
    // updateUser remplace l'objet entier : seules les clés gardées restent.
    await clerk.users.updateUser(u.id, { publicMetadata: kept });
    done++;
  } catch (e) {
    failed++;
    console.error(`Échec pour le compte ${u.id} :`, e?.errors ?? e?.message ?? e);
  }
}
console.log(`\nNettoyés : ${done}. Échecs : ${failed}.`);
process.exit(failed ? 1 : 0);
