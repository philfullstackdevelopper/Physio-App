// Bloc de données structurées (JSON-LD) dans la page : invisible, lu par les
// moteurs de recherche. « < » est échappé pour qu'un texte ne puisse jamais
// fermer la balise <script>.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
