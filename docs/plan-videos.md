# Plan : passer de 63 à ~300 vidéos d'exercices

Recherche du 2026-11-02 (sources en bas). Objectif : des vidéos cohérentes avec
les 63 de Jules (verticales 1080×1920, même décor), légalement propres, vite et
pour peu d'argent.

## Ce qu'on a comparé

| Option | Verdict |
|---|---|
| **Re-filmer en lot avec Jules + effet miroir** | **Recommandé.** Peu coûteux, 2-3 semaines, même style que l'existant. |
| Licence d'une banque (Hyperhuman) | Seul vrai plan B : ~191 $/mois facturé à l'année, surtout « salle de sport », style différent. |
| Physitrack, Medbridge, Wibbi, Rehab My Patient | Pas d'offre de licence de contenu trouvée (et ce sont des concurrents). |
| Banques d'images (Shutterstock, Pond5) | ~79 $ le clip, modèles et décors tous différents : non. |
| Vidéo par IA (Veo, Kling…) | **Non pour des démonstrations cliniques** : anatomie parfois fausse, droits flous, étiquetage obligatoire (AI Act, art. 50, depuis le 2 août 2026). |
| Vidéos envoyées par les kinés | Plus tard, après le lancement, avec relecture par le kiné partenaire et une clause dans les CGU. |
| Étudiants IFMK / clubs | Possible mais lent (calendrier scolaire, contrats de droit à l'image). |

## Le plan sur 30 jours

1. **Jours 1-5 — préparer**
   - Choisir ~240 exercices dans la banque (les plus prescrits d'abord) ; marquer ceux qui sont symétriques (filmés d'un seul côté, l'autre côté s'obtient en miroir).
   - Liste de tournage **regroupée par position** (au sol, debout, chaise, puis par matériel) pour ne jamais redéplacer le décor.
   - Un fichier CSV : numéro, nom, ordre de passage (sert à renommer les fichiers automatiquement).
   - **Contrat avec Jules** : facture de prestation (il est libéral) + cession de droit à l'image **forfaitaire, durée fixe (ex. 10 ans), monde entier, usages listés** (appli, site, publicité). Une cession sans durée est révocable ; une cession forfaitaire est valable. À faire relire par un juriste.
2. **Jours 6-8 — tester** : même téléphone, trépied, mise au point / exposition / balance des blancs **verrouillées**, mur uni, deux panneaux LED, repères au sol. Test d'une heure sur 10 exercices, comparer au cadrage des 63 existantes.
3. **Jours 9-10 — tourner** : ~120-150 exercices par jour ; avant chaque exercice, montrer une ardoise avec son numéro ; 3 répétitions propres ; Jules vérifie le geste après chaque prise.
4. **Jours 11-18 — monter automatiquement** (ffmpeg) :
   - couper selon les temps du CSV ;
   - stabiliser seulement si besoin (vidstab) ;
   - créer le côté opposé par miroir (`hflip`) pour les exercices symétriques, après vérification par le kiné ;
   - compresser avec le script existant `scripts/videos-r2-preparer.mjs`, envoyer avec `scripts/videos-r2-envoyer.mjs` ;
   - ajouter les noms dans `lib/exercise/filmedExercises.ts`.
5. **Jours 19-22** : le kiné partenaire relit chaque clip ; liste des reprises.
6. **Jours 23-25** : une demi-journée de reprises.
7. **Jours 26-30** : mise en ligne ; les kinés voient automatiquement les nouveaux exercices filmés (`ONLY_FILMED_EXERCISES`).

## Points à vérifier
- Un kiné peut-il apparaître dans une appli commerciale (déontologie) ? → demander au CNOMK.
- Tarif de Jules : pas de référence publique trouvée ; à négocier (prestation + forfait droit à l'image).

## Sources
- Hyperhuman : https://hyperhuman.cc/exercise-video-api , https://hyperhuman.cc/pricing
- Physitrack / PhysioTools (conditions) : https://www.physitrack.com/physiotools/terms-of-use
- Shutterstock (prix clip, source tierce) : https://photutorial.com/shutterstock-video-pricing
- Veo (prix, source tierce) : https://benchlm.ai/media-pricing/veo
- Sora arrêté : https://the-decoder.com/openai-sets-two-stage-sora-shutdown-with-app-closing-april-2026-and-api-following-in-september/
- AI Act art. 50 : https://artificialintelligenceact.eu/?p=6131
- Droit à l'image, cession forfaitaire : https://actu.dalloz-etudiant.fr/fileadmin/actualites/pdfs/CAParis10sept2008.pdf
- Cession sans durée révocable : https://cms.law/en/fra/legal-updates/droit-a-l-image-une-cession-sans-limitation-de-duree-n-est-pas-nulle-mais-elle-est-revocable
- Stabilisation ffmpeg : https://paulirish.com/2021/video-stabilization-with-ffmpeg-and-vidstab/
