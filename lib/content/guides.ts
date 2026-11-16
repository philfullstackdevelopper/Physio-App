// Guides publics (pages /guides et /guides/<slug>) : des articles utiles aux
// kinés et aux patients, écrits pour être trouvés sur Google et repris par les
// assistants IA (« logiciel exercices kiné », « exercices de kiné à la maison »…).
//
// Règles :
// - Rien de clinique ici (pas de protocole, pas de consigne d'exercice) : ce
//   contenu n'est pas relu par le kiné partenaire. On décrit l'outil et
//   l'organisation du suivi, et on renvoie toujours au kiné du patient.
// - Les montants viennent de lib/billing/patientPlans.ts via des repères
//   {kine}, {low}, {high}, {trial} remplacés à l'affichage.
// - Français = texte de référence ; l'anglais est une traduction de Claude.

export type GuideLocale = "fr" | "en";

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface GuideText {
  title: string;
  /** Phrase sous le titre, reprise dans la description Google. */
  description: string;
  sections: GuideSection[];
}

export interface Guide {
  slug: string;
  audience: "kine" | "patient";
  published: string;
  updated: string;
  text: Record<GuideLocale, GuideText>;
}

export const GUIDES: Guide[] = [
  {
    slug: "logiciel-exercices-kine-gratuit",
    audience: "kine",
    published: "2026-11-16",
    updated: "2026-11-16",
    text: {
      fr: {
        title: "Logiciel d'exercices pour kiné gratuit : créer des programmes à domicile pour vos patients",
        description:
          "Ce qu'un logiciel d'exercices doit faire pour un kiné libéral, et comment EasyPhysio le propose gratuitement : programmes filmés, suivi de la douleur et de l'assiduité, sans abonnement.",
        sections: [
          {
            heading: "Pourquoi un logiciel d'exercices ?",
            paragraphs: [
              "Une rééducation se joue autant entre les séances qu'au cabinet. Une feuille d'exercices photocopiée se perd vite, et le kiné ne sait pas, d'une séance à l'autre, si le patient a travaillé ni comment il l'a vécu.",
              "Un logiciel d'exercices remplace la feuille par un programme sur le téléphone du patient : il voit chaque exercice, suit sa séance pas à pas et indique ce qu'il a ressenti. Le kiné retrouve ces informations avant le rendez-vous suivant.",
            ],
          },
          {
            heading: "Ce qu'il doit faire, concrètement",
            paragraphs: ["Pour être utile au quotidien d'un cabinet, l'outil doit au minimum :"],
            bullets: [
              "proposer une bibliothèque d'exercices montrés en vidéo ou en animation, avec des consignes claires ;",
              "permettre d'assembler un programme en quelques minutes, puis de l'ajuster pour un patient précis ;",
              "guider le patient séance par séance sur son téléphone, sans matériel particulier ;",
              "remonter au kiné l'assiduité et la douleur ressentie, pour adapter le programme ;",
              "permettre d'échanger des messages avec le patient ;",
              "héberger les données de santé chez un hébergeur certifié HDS, comme l'exige la loi en France.",
            ],
          },
          {
            heading: "Gratuit pour le kiné : comment c'est possible",
            paragraphs: [
              "La plupart des logiciels du marché demandent au kiné un abonnement mensuel, qu'il ait beaucoup de patients actifs ou très peu. EasyPhysio fonctionne autrement : le kiné l'utilise gratuitement, sans abonnement et sans limite de patients.",
              "C'est le patient qui choisit de souscrire au suivi entre les séances : il paie l'accès à l'application ({low} € à {high} € par mois selon l'engagement) et {kine} € par mois à son kiné, versés directement sur le compte du kiné, sans commission, les mois où celui-ci met à jour son programme. Le kiné peut donc être rémunéré pour le temps qu'il passe à suivre son patient à distance.",
            ],
          },
          {
            heading: "Comment démarrer",
            paragraphs: [
              "Créez votre compte praticien, composez un premier programme à partir des exercices filmés, puis invitez un patient avec un lien ou un QR code. Le patient installe l'application sur son téléphone et retrouve son programme. EasyPhysio est en phase de lancement : si les inscriptions ne sont pas encore ouvertes, laissez votre adresse sur la liste d'attente de la page d'accueil.",
            ],
          },
        ],
      },
      en: {
        title: "Free exercise software for physiotherapists: build home programmes for your patients",
        description:
          "What exercise software should do for a physiotherapist in private practice, and how EasyPhysio offers it for free: filmed programmes, pain and adherence tracking, no subscription.",
        sections: [
          {
            heading: "Why exercise software?",
            paragraphs: [
              "Rehab happens as much between sessions as in the clinic. A photocopied exercise sheet gets lost, and from one session to the next the physio doesn't know whether the patient trained or how it felt.",
              "Exercise software replaces the sheet with a programme on the patient's phone: they see every exercise, follow their session step by step and say how it felt. The physio finds this information before the next appointment.",
            ],
          },
          {
            heading: "What it should actually do",
            paragraphs: ["To be useful in a busy practice, the tool should at least:"],
            bullets: [
              "offer a library of exercises shown on video or animation, with clear instructions;",
              "let you build a programme in a few minutes, then adjust it for a given patient;",
              "guide the patient session by session on their phone, with no special equipment;",
              "report adherence and pain back to the physio, so the programme can be adapted;",
              "let you message the patient;",
              "host health data with a certified health-data host (HDS), as French law requires.",
            ],
          },
          {
            heading: "Free for the physio: how it works",
            paragraphs: [
              "Most software on the market charges the physio a monthly subscription, however many active patients they have. EasyPhysio works differently: physios use it for free, with no subscription and no patient limit.",
              "The patient chooses to subscribe to follow-up between sessions: they pay for app access (€{low} to €{high} a month depending on commitment) and €{kine} a month to their physio, paid straight into the physio's account with no commission, in months when the physio updates their programme. The physio can therefore be paid for the time spent following the patient remotely.",
            ],
          },
          {
            heading: "How to get started",
            paragraphs: [
              "Create your practitioner account, build a first programme from the filmed exercises, then invite a patient with a link or QR code. The patient installs the app and finds their programme. EasyPhysio is launching: if sign-ups aren't open yet, leave your e-mail on the waiting list on the home page.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "programme-exercices-domicile-patient",
    audience: "kine",
    published: "2026-11-16",
    updated: "2026-11-16",
    text: {
      fr: {
        title: "Programme d'exercices à domicile : aider vos patients à les faire vraiment",
        description:
          "Pistes concrètes pour qu'un patient fasse ses exercices de rééducation entre deux séances : un programme court et clair, des consignes visibles, un retour régulier au kiné.",
        sections: [
          {
            heading: "Le problème : ce qui se passe entre deux séances",
            paragraphs: [
              "Tous les kinés le constatent : une partie des patients fait peu ses exercices à la maison, faute de temps, de motivation ou parce qu'ils ne se souviennent plus bien des mouvements. Or le kiné n'a souvent aucun moyen de le savoir avant de revoir son patient.",
            ],
          },
          {
            heading: "Ce qui aide le patient à s'y tenir",
            paragraphs: ["Quelques principes simples rendent le travail à domicile plus régulier :"],
            bullets: [
              "un programme court, avec peu d'exercices bien choisis plutôt qu'une longue liste ;",
              "chaque exercice montré, en vidéo ou en dessin, avec la consigne sous les yeux au moment de le faire ;",
              "une séance guidée, exercice après exercice, avec les répétitions et les temps de repos ;",
              "un moyen simple de dire « c'était difficile » ou « ça m'a fait mal » ;",
              "le sentiment que le kiné regarde : savoir que son suivi est vu motive davantage.",
            ],
          },
          {
            heading: "Ce qu'EasyPhysio apporte au kiné",
            paragraphs: [
              "Avec EasyPhysio, le kiné voit pour chaque patient les séances faites, leur régularité et la douleur notée en fin de séance. Il ajuste le programme à distance, pour ce patient uniquement, et le patient reçoit automatiquement un message. Les échanges restent dans l'application, et les données de santé sont hébergées en France chez un hébergeur certifié HDS.",
              "Le kiné garde la main : c'est lui qui choisit les exercices, les dose et décide quand passer à l'étape suivante. L'application ne remplace pas le bilan ni les séances au cabinet ; elle fait le lien entre les deux.",
            ],
          },
        ],
      },
      en: {
        title: "Home exercise programmes: helping your patients actually do them",
        description:
          "Practical ways to help patients do their rehab exercises between sessions: a short, clear programme, visible instructions and regular feedback to the physio.",
        sections: [
          {
            heading: "The problem: what happens between sessions",
            paragraphs: [
              "Every physio sees it: some patients do few of their exercises at home, for lack of time or motivation, or because they no longer remember the movements well. And the physio often has no way of knowing before seeing the patient again.",
            ],
          },
          {
            heading: "What helps patients stick to it",
            paragraphs: ["A few simple principles make home training more regular:"],
            bullets: [
              "a short programme, with a few well-chosen exercises rather than a long list;",
              "each exercise shown, on video or as a drawing, with the instruction in view while doing it;",
              "a guided session, one exercise after another, with repetitions and rest times;",
              "a simple way to say \"that was hard\" or \"that hurt\";",
              "the feeling that the physio is watching: knowing their follow-up is seen motivates patients more.",
            ],
          },
          {
            heading: "What EasyPhysio gives the physio",
            paragraphs: [
              "With EasyPhysio, the physio sees for each patient the sessions done, how regular they are and the pain noted at the end of each session. They adjust the programme remotely, for that patient only, and the patient automatically gets a message. Conversations stay in the app, and health data is hosted in France with a certified health-data host (HDS).",
              "The physio stays in charge: they choose the exercises, set the dose and decide when to move to the next stage. The app does not replace the assessment or the sessions in the clinic; it links the two.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "suivi-entre-seances-kine-remuneration",
    audience: "kine",
    published: "2026-11-16",
    updated: "2026-11-16",
    text: {
      fr: {
        title: "Être rémunéré pour le suivi entre les séances : comment fonctionne EasyPhysio",
        description:
          "Le suivi à distance des exercices prend du temps au kiné. Avec EasyPhysio, le patient qui y souscrit verse {kine} € par mois à son kiné, sans commission. Explications.",
        sections: [
          {
            heading: "Un temps de travail qui n'était pas payé",
            paragraphs: [
              "Préparer un programme, le relire, l'ajuster après un retour du patient, répondre à ses messages : ce suivi entre deux séances représente un vrai travail, qui n'entre pas dans les actes remboursés.",
            ],
          },
          {
            heading: "Le fonctionnement",
            paragraphs: ["Avec EasyPhysio, le patient choisit de souscrire au suivi entre les séances. Il paie alors deux choses distinctes :"],
            bullets: [
              "l'accès à l'application, à EasyPhysio : de {low} € à {high} € par mois selon la durée d'engagement, après {trial} jours d'essai ;",
              "le programme de son kiné : {kine} € par mois, versés directement sur le compte Stripe du kiné, uniquement les mois où le kiné met à jour son programme.",
            ],
          },
          {
            heading: "Ce qu'il faut savoir",
            paragraphs: [
              "EasyPhysio ne prend aucune commission sur la somme versée au kiné : les deux paiements sont séparés, avec deux factures distinctes. Le kiné reçoit une note d'honoraires à son nom, et le patient accepte ce suivi avant tout paiement. Ce suivi n'est pas remboursé par l'Assurance Maladie, et le patient peut l'arrêter à tout moment depuis l'application.",
              "Pour le kiné, l'outil reste gratuit : pas d'abonnement, pas de limite de patients. Cet article décrit le fonctionnement d'EasyPhysio ; ce n'est pas un conseil juridique ou fiscal.",
            ],
          },
        ],
      },
      en: {
        title: "Getting paid for follow-up between sessions: how EasyPhysio works",
        description:
          "Following a patient's exercises remotely takes a physio's time. With EasyPhysio, a patient who subscribes pays their physio €{kine} a month, with no commission. Here's how.",
        sections: [
          {
            heading: "Work that wasn't paid",
            paragraphs: [
              "Preparing a programme, reviewing it, adjusting it after the patient's feedback, answering messages: this follow-up between sessions is real work that isn't part of reimbursed treatment.",
            ],
          },
          {
            heading: "How it works",
            paragraphs: ["With EasyPhysio, the patient chooses to subscribe to follow-up between sessions. They then pay for two separate things:"],
            bullets: [
              "access to the app, to EasyPhysio: €{low} to €{high} a month depending on commitment, after a {trial}-day trial;",
              "their physio's programme: €{kine} a month, paid straight into the physio's Stripe account, only in months when the physio updates the programme.",
            ],
          },
          {
            heading: "Good to know",
            paragraphs: [
              "EasyPhysio takes no commission on what the physio receives: the two payments are separate, with two separate invoices. The physio receives a fee note in their own name, and the patient agrees to this follow-up before any payment. In France this follow-up is not reimbursed by the national health insurance, and the patient can stop it at any time from the app.",
              "For the physio the tool stays free: no subscription, no patient limit. This article describes how EasyPhysio works; it is not legal or tax advice.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "exercices-kine-a-la-maison",
    audience: "patient",
    published: "2026-11-16",
    updated: "2026-11-16",
    text: {
      fr: {
        title: "Faire ses exercices de kiné à la maison : une appli pour vous guider entre deux séances",
        description:
          "Votre kiné vous a donné des exercices à faire chez vous ? EasyPhysio vous guide séance par séance sur votre téléphone, et votre kiné suit vos progrès.",
        sections: [
          {
            heading: "Pourquoi les exercices à la maison comptent",
            paragraphs: [
              "Votre kiné vous voit une ou deux fois par semaine. Le reste du temps, c'est vous qui faites avancer votre rééducation, avec les exercices qu'il vous a confiés. Les faire régulièrement et correctement aide à reprendre plus sereinement vos activités.",
            ],
          },
          {
            heading: "Ce que fait l'application",
            paragraphs: ["EasyPhysio reprend le programme préparé par votre kiné :"],
            bullets: [
              "chaque exercice est montré en vidéo ou en dessin animé, avec des consignes écrites ;",
              "la séance se déroule pas à pas, avec les répétitions et les temps de repos ;",
              "en fin de séance, vous notez votre douleur, et votre kiné la voit ;",
              "vous pouvez écrire à votre kiné depuis l'application ;",
              "un téléphone suffit : pas de caméra, pas de montre connectée.",
            ],
          },
          {
            heading: "Toujours avec votre kiné",
            paragraphs: [
              "EasyPhysio ne remplace pas votre kiné : c'est lui qui choisit vos exercices et les adapte. En cas de douleur vive ou inhabituelle, arrêtez l'exercice et parlez-en à votre kiné.",
              "L'application s'utilise sur invitation de votre kiné. Après {trial} jours offerts, le suivi coûte de {low} € à {high} € par mois pour l'accès à l'application selon l'engagement, plus {kine} € versés à votre kiné les mois où il met à jour votre programme. Ce suivi n'est pas remboursé par l'Assurance Maladie, et vous pouvez l'arrêter à tout moment.",
            ],
          },
        ],
      },
      en: {
        title: "Doing your physio exercises at home: an app to guide you between sessions",
        description:
          "Has your physio given you exercises to do at home? EasyPhysio guides you session by session on your phone, and your physio follows your progress.",
        sections: [
          {
            heading: "Why home exercises matter",
            paragraphs: [
              "Your physio sees you once or twice a week. The rest of the time, you move your rehab forward with the exercises they gave you. Doing them regularly and correctly helps you get back to your activities with more confidence.",
            ],
          },
          {
            heading: "What the app does",
            paragraphs: ["EasyPhysio follows the programme your physio prepared:"],
            bullets: [
              "each exercise is shown on video or as an animation, with written instructions;",
              "the session runs step by step, with repetitions and rest times;",
              "at the end of the session you note your pain, and your physio sees it;",
              "you can message your physio from the app;",
              "a phone is enough: no camera, no smartwatch.",
            ],
          },
          {
            heading: "Always with your physio",
            paragraphs: [
              "EasyPhysio does not replace your physio: they choose your exercises and adapt them. If you feel sharp or unusual pain, stop the exercise and talk to your physio.",
              "The app is used on your physio's invitation. After a {trial}-day free trial, follow-up costs €{low} to €{high} a month for app access depending on commitment, plus €{kine} paid to your physio in months when they update your programme. In France it is not reimbursed by the national health insurance, and you can stop at any time.",
            ],
          },
        ],
      },
    },
  },
];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
