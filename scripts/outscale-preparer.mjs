#!/usr/bin/env node
// Prépare le stockage des vidéos d'exercices chez Outscale (OOS, compatible S3),
// l'hébergeur de fichiers recommandé avec Scalingo.
//
// À lancer UNE fois, après avoir créé le compte Outscale et ses clés d'accès
// (voir docs/outscale-mise-en-place.md) et les avoir mises dans .env.local :
//   S3_ENDPOINT=https://oos.eu-west-2.outscale.com
//   S3_REGION=eu-west-2
//   S3_ACCESS_KEY_ID=...
//   S3_SECRET_ACCESS_KEY=...
//   S3_BUCKET_EXERCISE_MEDIA=easyphysio-exercise-media   (nom unique)
//
//   node --env-file=.env.local scripts/outscale-preparer.mjs
//
// Ce que fait le script (sans rien supprimer, on peut le relancer) :
//   1. vérifie que les clés fonctionnent ;
//   2. crée le « bucket » (l'espace de stockage) s'il n'existe pas ;
//   3. autorise le site à y envoyer des fichiers depuis le navigateur (CORS) ;
//   4. rend les vidéos LISIBLES par tous (comme aujourd'hui sur Supabase : ce
//      sont des vidéos de démonstration d'exercices, pas des données de santé),
//      mais jamais modifiables sans les clés ;
//   5. envoie un petit fichier de test, vérifie qu'on peut le lire par son
//      adresse publique, puis le supprime.
// Les clés ne sont jamais affichées.

import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
const region = process.env.S3_REGION ?? "eu-west-2";
const bucket = process.env.S3_BUCKET_EXERCISE_MEDIA ?? "";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

const missing = [
  ["S3_ENDPOINT", endpoint],
  ["S3_ACCESS_KEY_ID", accessKeyId],
  ["S3_SECRET_ACCESS_KEY", secretAccessKey],
  ["S3_BUCKET_EXERCISE_MEDIA", bucket],
].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Il manque dans .env.local : ${missing.join(", ")}. Voir docs/outscale-mise-en-place.md.`);
  process.exit(1);
}

const s3 = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
const step = (n, t) => console.log(`\n${n}. ${t}`);

// Sites autorisés à envoyer des fichiers directement depuis le navigateur.
const ORIGINS = [
  "https://easyphysio.fr",
  "https://www.easyphysio.fr",
  "https://easyphysio.osc-fr1.scalingo.io",
  "http://localhost:3000",
];

step(1, `Connexion à ${endpoint} (région ${region})…`);
let exists = false;
try {
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  exists = true;
  console.log(`   OK — le bucket « ${bucket} » existe déjà.`);
} catch (e) {
  const code = e?.$metadata?.httpStatusCode;
  if (code === 404) console.log(`   OK — clés valides, le bucket « ${bucket} » n'existe pas encore.`);
  else if (code === 403) {
    console.error(`   Accès refusé (403) : soit les clés sont fausses, soit le nom « ${bucket} » appartient déjà à un autre client Outscale. Choisissez un autre nom (ex. easyphysio-videos-${Date.now().toString(36)}).`);
    process.exit(1);
  } else {
    console.error(`   Échec de connexion : ${e?.name ?? ""} ${e?.message ?? e}`);
    process.exit(1);
  }
}

if (!exists) {
  step(2, `Création du bucket « ${bucket} »…`);
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log("   OK");
} else step(2, "Création : inutile.");

step(3, "Autorisation des envois depuis le site (CORS)…");
await s3.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        { AllowedOrigins: ORIGINS, AllowedMethods: ["PUT", "GET", "HEAD"], AllowedHeaders: ["*"], MaxAgeSeconds: 3600 },
      ],
    },
  }),
);
console.log("   OK");

step(4, "Lecture publique des vidéos (jamais l'écriture)…");
let policyOk = false;
try {
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          { Sid: "LectureVideosExercices", Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] },
        ],
      }),
    }),
  );
  policyOk = true;
  console.log("   OK");
} catch (e) {
  console.log(`   Politique de bucket refusée (${e?.name ?? e}) : on vérifiera la lecture au point 5.`);
}

step(5, "Test : envoi d'un petit fichier, lecture par son adresse publique, suppression…");
const key = `_test/${Date.now()}.txt`;
await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "EasyPhysio test", ContentType: "text/plain" }));
const url = `${endpoint}/${bucket}/${key}`;
const res = await fetch(url);
await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
if (res.ok) {
  console.log("   OK — le fichier est lisible publiquement, puis supprimé.");
} else {
  console.error(`   Le fichier n'est pas lisible publiquement (HTTP ${res.status}).${policyOk ? "" : " La politique de lecture publique n'a pas pu être posée."} À régler dans la console Outscale avant de mettre les vidéos.`);
  process.exit(1);
}

console.log(`
Tout est prêt. Variables à ajouter sur Scalingo (application easyphysio) :
  STORAGE_PROVIDER=s3
  S3_ENDPOINT=${endpoint}
  S3_REGION=${region}
  S3_BUCKET_EXERCISE_MEDIA=${bucket}
  S3_ACCESS_KEY_ID=(la même que dans .env.local)
  S3_SECRET_ACCESS_KEY=(la même que dans .env.local)
`);
