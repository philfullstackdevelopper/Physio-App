// Accueil de la landing, section « Lundi matin, 8 h », sur téléphone
// uniquement (Philippe, 2026-10-26 : « mets la page récapitulative que l'on
// voit quand on est sur téléphone, pas celle d'ordi […] dans un vrai
// téléphone »).
//
// L'écran affiché est le vrai accueil kiné version téléphone, avec des données
// fictives : /prototypes/kine-telephone (le même que la démo). Il est chargé
// dans un iframe à la largeur d'un téléphone (340 px, donc sa mise en page
// téléphone), puis réduit pour tenir dans le cadre. Simple image animée :
// on ne peut pas cliquer dedans (le bouton « Essayer » mène à la vraie démo).

const SCREEN_W = 340; // largeur « réelle » de l'écran simulé
const SCREEN_H = 700;
const SCALE = 0.7; // → écran affiché : 238 × 490 px

export default function KinePhonePreview() {
  return (
    <div className="mx-auto w-fit" aria-hidden>
      <div className="relative rounded-[2.4rem] border-[6px] border-slate-900 bg-slate-900 p-1 shadow-2xl shadow-blue-900/15">
        <span className="absolute -left-[8px] top-20 h-7 w-1.5 rounded-l-full bg-slate-900" />
        <span className="absolute -right-[8px] top-28 h-12 w-1.5 rounded-r-full bg-slate-900" />
        <div
          className="relative overflow-hidden rounded-[2rem] bg-[#f4f7fc]"
          style={{ width: SCREEN_W * SCALE, height: SCREEN_H * SCALE }}
        >
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
          <iframe
            src="/prototypes/kine-telephone"
            title="Accueil kiné sur téléphone"
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${SCALE})`, paddingTop: 22 }}
          />
        </div>
      </div>
    </div>
  );
}
