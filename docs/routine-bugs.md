# Routine de correction des bugs (Philippe, 2026-11-04)

But : chaque jour, relever les erreurs que rencontrent les visiteurs et les
kinés, les trier, et préparer une correction — **jamais mise en ligne sans
l'accord de Philippe**.

## Sources lues

1. **PostHog → Error tracking** (erreurs du navigateur) : site public et
   espace kiné seulement. L'espace patient n'envoie rien à PostHog (données de
   santé, PostHog n'est pas HDS — `lib/analytics/privacy.ts`).
2. **Logs Scalingo** de l'app `easyphysio` (erreurs serveur, toutes pages, y
   compris l'espace patient) : `scalingo --region osc-fr1 --app easyphysio logs --lines 5000`.

## Déroulé

1. Lire les erreurs des dernières 24 h (PostHog : API avec la clé personnelle
   `POSTHOG_PERSONAL_API_KEY`, droits en lecture seule, rangée par Philippe
   dans `.env.local` ; Scalingo : logs).
2. Regrouper par cause, écarter le bruit (extensions de navigateur, robots,
   coupures réseau), classer : bloquant / gênant / mineur.
3. Pour chaque erreur réelle : trouver la cause dans le code, écrire la
   correction sur une branche `fix/…`, lancer `npm test` et la vérification
   des types.
4. Envoyer à Philippe un résumé en français simple : ce qui casse, pour qui,
   la correction proposée. **Rien n'est poussé sur `main` avant son « oui ».**
5. Après son accord : pousser, suivre le déploiement Scalingo, vérifier que
   l'erreur ne revient pas le lendemain.

Jamais de correction qui touche la sécurité des données (RLS, migrations)
sans l'explication détaillée exigée par CLAUDE.md §3.
