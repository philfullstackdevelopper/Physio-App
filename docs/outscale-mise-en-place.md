# Héberger les vidéos d'exercices chez Outscale

**Pourquoi Outscale :** c'est l'hébergeur de fichiers recommandé par Scalingo (même écosystème, centres de données en France, certifications santé). Scalingo n'a pas de stockage de fichiers à lui (ses serveurs repartent de zéro à chaque déploiement), donc les vidéos doivent vivre ailleurs. Le code de l'appli est **déjà prêt** pour Outscale (`lib/storage/s3.ts`) : il suffit de quelques réglages.

Les vidéos de démonstration ne sont pas des données de santé : elles seront lisibles publiquement (comme une vidéo sur un site), mais seule l'appli pourra en ajouter ou en supprimer.

---

## Étape 1 — Créer le compte (à faire par Philippe, ~15 min)

1. Aller sur **outscale.com** → « Créer un compte » / « Essai » (accès à la console **Cockpit**).
2. Renseigner la société et un moyen de paiement (le coût sera très faible : quelques centaines de Mo de vidéos).
3. Choisir la région **eu-west-2** (France) si on vous le demande.

> Claude ne peut pas créer de compte à ta place ni saisir de moyen de paiement.

## Étape 2 — Créer les clés d'accès

1. Dans **Cockpit** → menu de ton compte → **« Access Keys »** (clés d'accès) → **Créer**.
2. Outscale affiche deux codes : **Access Key ID** et **Secret Key**. Le secret n'est montré **qu'une fois** : garde-le.
3. **Ne les colle pas dans le chat.**

## Étape 3 — Les mettre dans `.env.local`

Ouvre `C:\Users\ASUS\dev\Physio-App\.env.local` dans le Bloc-notes et ajoute à la fin :

```
S3_ENDPOINT=https://oos.eu-west-2.outscale.com
S3_REGION=eu-west-2
S3_ACCESS_KEY_ID=ta-access-key-id
S3_SECRET_ACCESS_KEY=ta-secret-key
S3_BUCKET_EXERCISE_MEDIA=easyphysio-exercise-media
```

Le dernier réglage est le **nom de l'espace de stockage** ; il doit être unique chez Outscale. Si le script répond que le nom est pris, change-le (ex. `easyphysio-videos-2026`).

Enregistre, puis dis à Claude « clés Outscale ajoutées ».

## Étape 4 — Préparation automatique (Claude)

```
node --env-file=.env.local scripts/outscale-preparer.mjs
```

Le script vérifie les clés, crée l'espace de stockage, autorise le site à y envoyer des vidéos, rend les vidéos lisibles, puis fait un essai complet (envoi → lecture → suppression). Il n'affiche jamais les clés.

## Étape 5 — Activer sur le site en ligne (Claude, avec ton accord)

Ajouter les mêmes réglages sur Scalingo, plus `STORAGE_PROVIDER=s3`, puis redéployer. À partir de là, toute vidéo envoyée depuis l'appli va chez Outscale.

## Étape 6 — Les 64 vidéos du tournage avec Jules

1. Préparer une version **légère** de chaque vidéo (pour le téléphone) à partir de `videos-tournage/final/`.
2. Les envoyer chez Outscale et relier chacune à son exercice.
3. Vérifier dans l'appli, puis relecture par Jules.
