# Buildpack minimal pour applications Procfile-seul

Ce buildpack ne compile rien de special : il telecharge le binaire
PostgREST (version Linux statique) et les clefs publiques Clerk (JWKS)
directement pendant la construction sur Scalingo, pour ne jamais avoir
a committer de gros binaires dans un depot git.

Utilise par l app easyphysio-postgrest via :
BUILDPACK_URL=https://github.com/philfullstackdevelopper/Physio-App.git#postgrest-null-buildpack
