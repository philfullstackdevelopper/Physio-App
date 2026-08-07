# Suivi des sous-traitants (DPA) — Physio-App

> Liste de travail à présenter à l'avocat. Chaque ligne = un prestataire qui
> touche une donnée personnelle, et ce qu'il reste à vérifier/signer avant
> un vrai lancement.

| Prestataire | Rôle | Donnée vue | DPA signé ? | HDS nécessaire ? | À vérifier |
|---|---|---|---|---|---|
| Scalingo | Hébergement app + base de données | Toutes (y compris santé) | ❌ Non | ✅ Oui — ils le sont (cert. n°38436) | Confirmer par écrit que l'offre/région souscrite est bien dans le périmètre certifié, pas juste la société en général. |
| Outscale | Stockage des documents médicaux | Documents patients uniquement | ❌ Non | ✅ Oui | Vérifier leur certification HDS propre pour ce service précis (pas seulement "même groupe que Scalingo"). |
| Prestataire emailing (ex. Brevo) | Envoi des liens d'invitation/réinitialisation | Email uniquement — jamais de donnée de santé dans le corps du message | ❌ Non | Non (pas de donnée de santé) | Vérifier hébergement UE et signer leur DPA standard. |
| Stripe | Paiement des abonnements | Données de facturation, jamais la carte elle-même | À vérifier (Stripe fournit un DPA standard) | Non | Confirmer que le DPA standard Stripe est bien accepté/signé. |
| Anthropic (Claude) | — | **Aucune actuellement** — `lib/ai/protocol.ts` est un mock, pas d'appel réel (vérifié le [date]) | N/A pour l'instant | À revoir **avant** d'implémenter le vrai appel IA | Ne pas activer le vrai appel sans avoir d'abord revu ce point avec l'avocat. |

## Ce qu'il manque encore pour être complet

- Un modèle de DPA (contrat de sous-traitance RGPD) à faire signer à chacun
  des prestataires ci-dessus qui n'en a pas encore un — l'avocat peut
  fournir un modèle type.
- Le registre des traitements (obligatoire RGPD, article 30) — pas encore
  rédigé, distinct de cette liste de sous-traitants.
- Une analyse d'impact (AIPD/DPIA) — probablement requise vu qu'il s'agit
  de données de santé à grande échelle potentielle ; c'est l'avocat/un DPO
  qui doit trancher si elle est obligatoire dans ce cas précis.
