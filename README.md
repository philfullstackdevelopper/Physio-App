# Buildpack minimal pour applications Procfile-seul

Telecharge, au moment du build sur Scalingo :
- le binaire PostgREST (Linux statique)
- les clefs publiques Clerk (JWKS)
- le binaire Caddy (reverse proxy statique, sert de "traducteur" entre
  le chemin /rest/v1/... attendu par @supabase/supabase-js et la racine
  ou PostgREST sert reellement ses tables)

Rien de gros n est committe dans le depot de l app lui-meme.
