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
  /** Sources citées (pages officielles, avec la date de relevé dans le texte). */
  sources?: { label: string; url: string }[];
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
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Logiciel d'exercices kiné gratuit : programmes à domicile",
        description:
          "Logiciel et application d'exercices gratuits pour le kiné, sans abonnement ni limite de patients : exercices filmés, suivi de la douleur et des séances.",
        sections: [
          {
            heading: "Pourquoi un logiciel d'exercices ?",
            paragraphs: [
              "Une rééducation se joue autant entre les séances qu'au cabinet. Une feuille d'exercices photocopiée se perd vite, et le kiné ne sait pas, d'une séance à l'autre, si le patient a travaillé ni comment il l'a vécu.",
              "Un logiciel (ou une application) d'exercices pour kiné remplace la feuille par un programme sur le téléphone du patient : il voit chaque exercice, suit sa séance pas à pas et indique ce qu'il a ressenti. Le kiné retrouve ces informations avant le rendez-vous suivant.",
            ],
          },
          {
            heading: "Ce qu'il doit faire, concrètement",
            paragraphs: ["Pour être utile au quotidien d'un cabinet, l'outil doit au minimum :"],
            bullets: [
              "proposer une bibliothèque d'exercices montrés en vidéo ou en animation, avec des consignes claires (voir [envoyer des exercices en vidéo à vos patients](/guides/envoyer-exercices-video-patient)) ;",
              "permettre d'assembler un programme en quelques minutes, puis de l'ajuster pour un patient précis ;",
              "guider le patient séance par séance sur son téléphone, sans matériel particulier ;",
              "remonter au kiné l'assiduité et la douleur ressentie, pour adapter le programme ;",
              "permettre d'échanger des messages avec le patient ;",
              "héberger les données de santé chez un [hébergeur certifié HDS](/guides/appli-kine-hebergement-hds), comme l'exige la loi en France.",
            ],
          },
          {
            heading: "Gratuit pour le kiné : comment c'est possible",
            paragraphs: [
              "La plupart des logiciels du marché demandent au kiné un abonnement mensuel, qu'il ait beaucoup de patients actifs ou très peu. EasyPhysio fonctionne autrement : le kiné l'utilise gratuitement, sans abonnement et sans limite de patients. Le [comparatif des prix des logiciels d'exercices](/guides/comparatif-logiciel-exercices-kine) détaille les tarifs affichés.",
              "C'est le patient qui choisit de souscrire au suivi entre les séances : il paie l'accès à l'application ({low} € à {high} € par mois selon l'engagement) et, à son kiné, le prix du programme fixé par celui-ci ({kine} € par mois par défaut, de 0 à 500 €), versé directement sur le compte du kiné, sans commission, les mois où celui-ci met à jour son programme. Le kiné peut donc être rémunéré pour le temps qu'il passe à suivre son patient à distance.",
            ],
          },
          {
            heading: "Comment démarrer",
            paragraphs: [
              "Créez votre compte praticien, composez un premier programme à partir des exercices filmés, puis invitez un patient avec un lien ou un QR code. Le patient installe l'application sur son téléphone et retrouve son programme. Pour voir l'outil avant de créer un compte, la [démo](/demo) s'essaie sans inscription, avec des patients fictifs.",
            ],
          },
        ],
      },
      en: {
        title: "Free exercise software for physios: home programmes",
        description:
          "EasyPhysio is free exercise software for physiotherapists, with no subscription and no patient limit: filmed exercises, pain and adherence tracking.",
        sections: [
          {
            heading: "Why exercise software?",
            paragraphs: [
              "Rehab happens as much between sessions as in the clinic. A photocopied exercise sheet gets lost, and from one session to the next the physio doesn't know whether the patient trained or how it felt.",
              "Exercise software (or an exercise app) for physios replaces the sheet with a programme on the patient's phone: they see every exercise, follow their session step by step and say how it felt. The physio finds this information before the next appointment.",
            ],
          },
          {
            heading: "What it should actually do",
            paragraphs: ["To be useful in a busy practice, the tool should at least:"],
            bullets: [
              "offer a library of exercises shown on video or animation, with clear instructions (see [sending exercise videos to your patients](/guides/envoyer-exercices-video-patient));",
              "let you build a programme in a few minutes, then adjust it for a given patient;",
              "guide the patient session by session on their phone, with no special equipment;",
              "report adherence and pain back to the physio, so the programme can be adapted;",
              "let you message the patient;",
              "host health data with a [certified health-data host (HDS)](/guides/appli-kine-hebergement-hds), as French law requires.",
            ],
          },
          {
            heading: "Free for the physio: how it works",
            paragraphs: [
              "Most software on the market charges the physio a monthly subscription, however many active patients they have. EasyPhysio works differently: physios use it for free, with no subscription and no patient limit. The [exercise software price comparison](/guides/comparatif-logiciel-exercices-kine) lists published prices.",
              "The patient chooses to subscribe to follow-up between sessions: they pay for app access (€{low} to €{high} a month depending on commitment) and, to their physio, the programme price the physio sets (€{kine} a month by default, from €0 to €500), paid straight into the physio's account with no commission, in months when the physio updates their programme. The physio can therefore be paid for the time spent following the patient remotely.",
            ],
          },
          {
            heading: "How to get started",
            paragraphs: [
              "Create your practitioner account, build a first programme from the filmed exercises, then invite a patient with a link or QR code. The patient installs the app and finds their programme. To see the tool before creating an account, the [demo](/demo) works without signing up, with fictional patients.",
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
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Programme d'exercices à domicile : 5 principes",
        description:
          "Un programme d'exercices à domicile est mieux suivi s'il est court, montré en vidéo, guidé pas à pas, avec un retour simple au kiné. Les 5 principes.",
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
              "le sentiment que le kiné regarde : [savoir si le patient fait ses exercices](/guides/savoir-si-patient-fait-ses-exercices), et le lui montrer, motive davantage.",
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
        title: "Home exercise programmes: 5 principles",
        description:
          "A home exercise programme is followed better when it is short, shown on video, guided step by step, with simple feedback to the physio. The 5 principles.",
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
              "the feeling that the physio is watching: [knowing whether the patient does their exercises](/guides/savoir-si-patient-fait-ses-exercices), and showing it, motivates patients more.",
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
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Suivi entre les séances : être rémunéré comme kiné",
        description:
          "Avec EasyPhysio, le patient qui souscrit au suivi paie à son kiné le prix qu'il fixe ({kine} € par mois par défaut), sans commission. Le fonctionnement.",
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
              "le programme de son kiné, au prix fixé par le kiné ({kine} € par mois par défaut, de 0 à 500 €, 0 € voulant dire offert), versé directement sur le compte Stripe du kiné, uniquement les mois où le kiné met à jour son programme.",
            ],
          },
          {
            heading: "Ce qu'il faut savoir",
            paragraphs: [
              "EasyPhysio ne prend aucune commission sur la somme versée au kiné : les deux paiements sont séparés, avec deux factures distinctes. Le kiné reçoit une note d'honoraires à son nom, et le patient accepte ce suivi avant tout paiement. Ce suivi n'est pas remboursé par l'Assurance Maladie, et le patient peut l'arrêter à tout moment depuis l'application.",
              "Pour le kiné, l'outil reste gratuit : pas d'abonnement, pas de limite de patients (voir le [comparatif des prix](/guides/comparatif-logiciel-exercices-kine)). Cet article décrit le fonctionnement d'EasyPhysio ; ce n'est pas un conseil juridique ou fiscal.",
            ],
          },
        ],
      },
      en: {
        title: "Follow-up between sessions: getting paid as a physio",
        description:
          "With EasyPhysio, a patient who subscribes pays their physio the price the physio sets (€{kine} a month by default), with no commission. How it works.",
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
              "their physio's programme, at the price the physio sets (€{kine} a month by default, from €0 to €500, €0 meaning free), paid straight into the physio's Stripe account, only in months when the physio updates the programme.",
            ],
          },
          {
            heading: "Good to know",
            paragraphs: [
              "EasyPhysio takes no commission on what the physio receives: the two payments are separate, with two separate invoices. The physio receives a fee note in their own name, and the patient agrees to this follow-up before any payment. In France this follow-up is not reimbursed by the national health insurance, and the patient can stop it at any time from the app.",
              "For the physio the tool stays free: no subscription, no patient limit (see the [price comparison](/guides/comparatif-logiciel-exercices-kine)). This article describes how EasyPhysio works; it is not legal or tax advice.",
            ],
          },
        ],
      },
    },
  },
  // Deux guides « question précise » (2026-11-25, pack de recherche SEO : sur un
  // site jeune, les pages qui répondent à UNE question précise se classent
  // avant les pages génériques). Rien de clinique : on décrit l'outil.
  {
    slug: "kine-du-sport-suivi-retour-au-sport",
    audience: "kine",
    published: "2026-11-25",
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Kiné du sport : suivre le retour au sport à distance",
        description:
          "Un kiné du sport peut suivre à distance le retour au sport avec EasyPhysio : programme par étapes, douleur notée après chaque séance, messages.",
        sections: [
          {
            heading: "Le sportif s'entraîne surtout entre les séances",
            paragraphs: [
              "Un patient sportif veut reprendre vite, et c'est souvent entre deux rendez-vous qu'il en fait trop, ou pas assez. Le kiné du sport a donc besoin de savoir ce qui se passe pendant ces jours-là : séances faites, douleur ressentie, difficultés rencontrées.",
            ],
          },
          {
            heading: "Que voit le kiné, concrètement ?",
            paragraphs: [
              "Le kiné voit, pour chaque patient, les séances terminées, leur régularité et la douleur notée sur 10 à la fin de chaque séance. Son tableau de bord fait ressortir les patients en retard et ceux qui signalent une douleur élevée, pour qu'il puisse réagir avant le rendez-vous suivant. Le détail : [savoir si votre patient fait ses exercices à la maison](/guides/savoir-si-patient-fait-ses-exercices).",
            ],
          },
          {
            heading: "Comment avance le programme ?",
            paragraphs: [
              "Le programme avance par étapes définies par le kiné : le patient ne passe à l'étape suivante que lorsque la précédente est acquise. Quand le patient signale de la douleur, l'application ralentit la progression, elle ne l'accélère jamais. C'est toujours le kiné qui décide d'ajuster le programme.",
            ],
            bullets: [
              "ajuster une séance pour un seul patient, sans toucher au programme des autres ;",
              "échanger des messages avec le patient dans l'application ;",
              "tenir compte du matériel que le patient a déclaré (élastique, haltères…) pour choisir les exercices.",
            ],
          },
          {
            heading: "Et pour le kiné ?",
            paragraphs: [
              "EasyPhysio est un [logiciel d'exercices gratuit pour le kiné](/guides/logiciel-exercices-kine-gratuit), sans abonnement ni limite de patients. Le kiné fixe le prix de son suivi entre les séances ({kine} € par mois par défaut, de 0 à 500 €), payé directement par le patient qui souscrit, sans commission. Les données de santé sont hébergées en France chez un hébergeur certifié HDS.",
            ],
          },
        ],
      },
      en: {
        title: "Sports physio: following return to sport remotely",
        description:
          "A sports physio can follow their patients' return to sport remotely with EasyPhysio: a step-by-step programme, pain noted after each session, messages.",
        sections: [
          {
            heading: "Athletes train mostly between sessions",
            paragraphs: [
              "An athlete wants to get back quickly, and it is often between appointments that they do too much, or too little. A sports physio therefore needs to know what happens on those days: sessions done, pain felt, difficulties met.",
            ],
          },
          {
            heading: "What does the physio actually see?",
            paragraphs: [
              "For each patient, the physio sees the sessions completed, how regular they are and the pain noted out of 10 at the end of each session. The dashboard highlights patients who are behind and those reporting high pain, so the physio can react before the next appointment. More detail: [how to know if your patient does their home exercises](/guides/savoir-si-patient-fait-ses-exercices).",
            ],
          },
          {
            heading: "How does the programme progress?",
            paragraphs: [
              "The programme moves forward in stages set by the physio: the patient only moves to the next stage once the previous one is achieved. When the patient reports pain, the app slows progression down, never speeds it up. The physio always decides when to adjust the programme.",
            ],
            bullets: [
              "adjust a session for one patient only, without changing anyone else's programme;",
              "message the patient in the app;",
              "take into account the equipment the patient has declared (resistance band, dumbbells…) when choosing exercises.",
            ],
          },
          {
            heading: "And for the physio?",
            paragraphs: [
              "EasyPhysio is [free exercise software for physios](/guides/logiciel-exercices-kine-gratuit), with no subscription and no patient limit. The physio sets the price of their follow-up between sessions (€{kine} a month by default, from €0 to €500), paid directly by the patient who subscribes, with no commission. Health data is hosted in France with a certified health-data host (HDS).",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "savoir-si-patient-fait-ses-exercices",
    audience: "kine",
    published: "2026-11-25",
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Savoir si votre patient fait ses exercices à la maison",
        description:
          "Pour savoir si un patient fait ses exercices à la maison, il faut un retour après chaque séance : avec EasyPhysio, le kiné voit séances faites et douleur.",
        sections: [
          {
            heading: "Pourquoi le kiné ne le sait pas, aujourd'hui",
            paragraphs: [
              "Avec une feuille d'exercices ou une vidéo envoyée par message, le kiné n'a qu'une source : ce que le patient lui dit au rendez-vous suivant. « Oui oui, j'ai fait mes exercices » ne dit ni combien de séances ont été faites, ni comment elles ont été vécues.",
            ],
          },
          {
            heading: "Ce qu'une appli de suivi change",
            paragraphs: [
              "Quand le patient suit sa séance sur son téléphone, chaque séance terminée est enregistrée, avec la douleur notée sur 10 à la fin. Le kiné le voit sans rien demander :",
            ],
            bullets: [
              "les séances faites, et leur régularité par rapport au nombre de séances prévues par semaine ;",
              "la douleur signalée, et son évolution sur les dernières semaines ;",
              "les patients en retard ou qui signalent une douleur élevée, mis en avant sur son tableau de bord ;",
              "les messages du patient, au même endroit.",
            ],
          },
          {
            heading: "Est-ce que ça aide le patient à s'y tenir ?",
            paragraphs: [
              "Savoir que son kiné voit son suivi motive davantage. La séance guidée aide aussi (voir les [5 principes d'un programme d'exercices à domicile](/guides/programme-exercices-domicile-patient)) : chaque exercice est montré en vidéo ou en dessin, avec les répétitions et les temps de repos, et un téléphone suffit, sans caméra ni montre connectée.",
              "EasyPhysio est un [logiciel d'exercices gratuit pour le kiné](/guides/logiciel-exercices-kine-gratuit), sans abonnement ni limite de patients. Le kiné choisit les exercices et ajuste le programme ; l'application ne remplace ni le bilan ni les séances au cabinet.",
            ],
          },
        ],
      },
      en: {
        title: "How to know if your patient does their home exercises",
        description:
          "To know whether a patient does their home exercises, you need feedback after each session: with EasyPhysio, the physio sees sessions done and pain.",
        sections: [
          {
            heading: "Why the physio doesn't know today",
            paragraphs: [
              "With an exercise sheet or a video sent by message, the physio has one source: what the patient says at the next appointment. \"Yes, yes, I did my exercises\" tells you neither how many sessions were done nor how they felt.",
            ],
          },
          {
            heading: "What a follow-up app changes",
            paragraphs: [
              "When the patient follows their session on their phone, each completed session is recorded, with the pain noted out of 10 at the end. The physio sees it without asking:",
            ],
            bullets: [
              "the sessions done, and how regular they are compared with the number planned per week;",
              "the pain reported, and how it changes over the last few weeks;",
              "patients who are behind or report high pain, highlighted on the dashboard;",
              "the patient's messages, in the same place.",
            ],
          },
          {
            heading: "Does it help the patient stick to it?",
            paragraphs: [
              "Knowing their physio sees their follow-up motivates patients more. The guided session helps too (see the [5 principles of a home exercise programme](/guides/programme-exercices-domicile-patient)): each exercise is shown on video or as a drawing, with repetitions and rest times, and a phone is enough, with no camera or smartwatch.",
              "EasyPhysio is [free exercise software for physios](/guides/logiciel-exercices-kine-gratuit), with no subscription and no patient limit. The physio chooses the exercises and adjusts the programme; the app replaces neither the assessment nor the sessions in the clinic.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "envoyer-exercices-video-patient",
    audience: "kine",
    published: "2026-11-25",
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Envoyer des exercices en vidéo à vos patients",
        description:
          "Envoyer des exercices en vidéo à un patient : un programme dans une appli vaut mieux qu'une vidéo par message. Il la retrouve, vous voyez ce qu'il fait.",
        sections: [
          {
            heading: "Vidéo par message ou programme dans une appli ?",
            paragraphs: [
              "Pour envoyer des exercices en vidéo à un patient, le plus efficace est de les lui donner dans un programme sur son téléphone, plutôt qu'une vidéo envoyée par message. Une vidéo filmée au cabinet et envoyée par SMS ou par une messagerie se perd vite dans la conversation, ne dit ni combien de répétitions faire ni dans quel ordre, et ne vous renvoie aucune information.",
              "Une messagerie grand public n'est pas non plus un hébergeur certifié pour les données de santé : une vidéo du patient ou de ses exercices y circule hors du cadre [HDS](/guides/appli-kine-hebergement-hds).",
            ],
          },
          {
            heading: "Ce que permet EasyPhysio",
            paragraphs: ["Avec EasyPhysio, le patient retrouve sa séance du jour dans l'application :"],
            bullets: [
              "les exercices sont montrés en vidéo (filmés par un kiné) ou en dessin animé, avec les consignes écrites, les répétitions et les temps de repos ;",
              "le kiné peut ajouter ses propres exercices et leur vidéo (MP4 ou MOV) ;",
              "la vidéo se lit en plein écran sur le téléphone, sans son ;",
              "à la fin de la séance, le patient note sa douleur, et le kiné la voit ;",
              "le programme peut aussi être imprimé pour le patient qui préfère le papier.",
            ],
          },
          {
            heading: "Et ensuite ?",
            paragraphs: [
              "Vous voyez qui a fait ses séances et qui a eu mal, et vous ajustez le programme à distance (voir [savoir si votre patient fait ses exercices](/guides/savoir-si-patient-fait-ses-exercices)). EasyPhysio est un [logiciel d'exercices gratuit pour le kiné](/guides/logiciel-exercices-kine-gratuit), sans abonnement ni limite de patients ; la [démo](/demo) s'essaie sans inscription.",
            ],
          },
        ],
      },
      en: {
        title: "Sending exercise videos to your patients",
        description:
          "To send exercise videos to a patient, a programme in an app beats a video sent by message: the patient finds it again, and you see what they do.",
        sections: [
          {
            heading: "Video by message or programme in an app?",
            paragraphs: [
              "To send exercise videos to a patient, the most effective way is to give them a programme on their phone rather than a video sent by message. A video filmed in the clinic and sent by text or a messaging app soon gets lost in the conversation, says neither how many repetitions to do nor in what order, and tells you nothing back.",
              "A consumer messaging app is not a certified health-data host either: a video of the patient or their exercises travels outside the [HDS](/guides/appli-kine-hebergement-hds) framework.",
            ],
          },
          {
            heading: "What EasyPhysio does",
            paragraphs: ["With EasyPhysio, the patient finds their session of the day in the app:"],
            bullets: [
              "exercises are shown on video (filmed by a physio) or as an animation, with written instructions, repetitions and rest times;",
              "the physio can add their own exercises and their video (MP4 or MOV);",
              "videos play full screen on the phone, without sound;",
              "at the end of the session the patient notes their pain, and the physio sees it;",
              "the programme can also be printed for patients who prefer paper.",
            ],
          },
          {
            heading: "And then?",
            paragraphs: [
              "You see who did their sessions and who had pain, and you adjust the programme remotely (see [how to know if your patient does their home exercises](/guides/savoir-si-patient-fait-ses-exercices)). EasyPhysio is [free exercise software for physios](/guides/logiciel-exercices-kine-gratuit), with no subscription and no patient limit; the [demo](/demo) works without signing up.",
            ],
          },
        ],
      },
    },
  },
  // Comparatif (2026-11-25) : les pages « comparatif / alternative » sont celles
  // qui amènent le plus d'inscriptions pour un logiciel. Règles : prix relevés
  // sur les pages officielles des éditeurs, avec la date ; on dit que la page
  // est publiée par EasyPhysio ; aucun jugement sur les concurrents. À revoir
  // quand un prix change (relever de nouveau, changer la date partout).
  {
    slug: "comparatif-logiciel-exercices-kine",
    audience: "kine",
    published: "2026-11-25",
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Logiciel d'exercices kiné : comparatif des prix",
        description:
          "Prix de 3 logiciels d'exercices pour kiné, relevés le 25 novembre 2026 : Physitrack, Physiom, et EasyPhysio, gratuit pour le kiné. Qui paie, et combien.",
        sections: [
          {
            heading: "Qui paie : le kiné ou le patient ?",
            paragraphs: [
              "La plupart des logiciels d'exercices pour kiné sont payés par le kiné, par un abonnement mensuel par praticien. EasyPhysio fonctionne autrement : il est gratuit pour le kiné, et c'est le patient qui paie s'il choisit de souscrire au suivi entre les séances. Pour un kiné qui cherche une alternative gratuite à Physitrack ou à Physiom, c'est la principale différence.",
            ],
          },
          {
            heading: "Les prix affichés, relevés le 25 novembre 2026",
            paragraphs: ["Prix publiés sur la page officielle de chaque éditeur à cette date :"],
            bullets: [
              "Physitrack : 23,99 $ par praticien et par mois (formule mensuelle, moins de 20 praticiens), ou 259,09 $ par an ; 2 semaines d'essai ; application patient gratuite.",
              "Physiom : 24,90 € par mois, soit 298,80 € par an ; patients illimités ; application patient comprise ; 15 jours d'essai sans carte bancaire.",
              "EasyPhysio : 0 € pour le kiné, sans abonnement, patients illimités. Le patient qui souscrit paie l'accès à l'application ({low} € à {high} € par mois selon l'engagement, après {trial} jours d'essai) et le prix du programme fixé par son kiné ({kine} € par mois par défaut), versé au kiné sans commission.",
            ],
          },
          {
            heading: "Comment choisir ?",
            paragraphs: ["Quelques questions à poser à chaque éditeur avant de se décider :"],
            bullets: [
              "qui paie, et combien par mois pour votre nombre de patients ;",
              "où sont hébergées les données de santé (en France, un [hébergeur certifié HDS](/guides/appli-kine-hebergement-hds) est obligatoire) ;",
              "les exercices sont-ils montrés en vidéo, avec des consignes en français ;",
              "voyez-vous l'assiduité et la douleur du patient entre les séances ;",
              "pouvez-vous ajuster le programme d'un patient à distance.",
            ],
          },
          {
            heading: "À savoir",
            paragraphs: [
              "Cette page est publiée par EasyPhysio. Les prix des autres logiciels peuvent changer : vérifiez-les sur le site de chaque éditeur, dont les liens figurent ci-dessous. Pour voir EasyPhysio avant de créer un compte, la [démo](/demo) s'essaie sans inscription.",
            ],
          },
        ],
        sources: [
          { label: "Physitrack : tarifs (page officielle, consultée le 25/11/2026)", url: "https://www.physitrack.com/fr/physitrack-pricing" },
          { label: "Physiom : tarifs (page officielle, consultée le 25/11/2026)", url: "https://physiom.tech/#tarifs" },
        ],
      },
      en: {
        title: "Physio exercise software: price comparison",
        description:
          "Prices of 3 exercise apps for physios, checked on 25 November 2026: Physitrack, Physiom, and EasyPhysio, free for the physio. Who pays, and how much.",
        sections: [
          {
            heading: "Who pays: the physio or the patient?",
            paragraphs: [
              "Most exercise software for physiotherapists is paid by the physio, through a monthly subscription per practitioner. EasyPhysio works differently: it is free for the physio, and the patient pays if they choose to subscribe to follow-up between sessions. For a physio looking for a free alternative to Physitrack or Physiom, that is the main difference.",
            ],
          },
          {
            heading: "Listed prices, checked on 25 November 2026",
            paragraphs: ["Prices published on each vendor's official page on that date:"],
            bullets: [
              "Physitrack: $23.99 per practitioner per month (monthly plan, under 20 practitioners), or $259.09 a year; 2-week trial; free patient app.",
              "Physiom: €24.90 a month, i.e. €298.80 a year; unlimited patients; patient app included; 15-day trial with no card.",
              "EasyPhysio: €0 for the physio, no subscription, unlimited patients. A patient who subscribes pays for app access (€{low} to €{high} a month depending on commitment, after a {trial}-day trial) and the programme price their physio sets (€{kine} a month by default), paid to the physio with no commission.",
            ],
          },
          {
            heading: "How to choose?",
            paragraphs: ["A few questions to ask each vendor before deciding:"],
            bullets: [
              "who pays, and how much a month for your number of patients;",
              "where health data is hosted (in France, a [certified HDS host](/guides/appli-kine-hebergement-hds) is mandatory);",
              "whether exercises are shown on video, with instructions in your language;",
              "whether you see the patient's adherence and pain between sessions;",
              "whether you can adjust a patient's programme remotely.",
            ],
          },
          {
            heading: "Good to know",
            paragraphs: [
              "This page is published by EasyPhysio. Other vendors' prices may change: check them on each vendor's website, linked below. To see EasyPhysio before creating an account, the [demo](/demo) works without signing up.",
            ],
          },
        ],
        sources: [
          { label: "Physitrack: pricing (official page, checked 25/11/2026)", url: "https://www.physitrack.com/physitrack-pricing" },
          { label: "Physiom: pricing (official page, checked 25/11/2026)", url: "https://physiom.tech/#tarifs" },
        ],
      },
    },
  },
  {
    slug: "appli-kine-hebergement-hds",
    audience: "kine",
    published: "2026-11-25",
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Appli kiné et données de santé : l'hébergement HDS",
        description:
          "Une appli de suivi kiné doit héberger les données de santé chez un hébergeur certifié HDS. EasyPhysio les héberge en France chez Scalingo, certifié HDS.",
        sections: [
          {
            heading: "Pourquoi une appli kiné doit être hébergée HDS",
            paragraphs: [
              "En France, des données de santé confiées à un prestataire doivent être hébergées chez un hébergeur certifié HDS (Hébergeur de Données de Santé), selon l'article L.1111-8 du Code de la santé publique. Une appli de suivi des exercices en contient : douleur notée, séances faites, situation du patient, messages avec le kiné.",
            ],
          },
          {
            heading: "Où sont hébergées les données d'EasyPhysio ?",
            paragraphs: [
              "Les données de santé d'EasyPhysio sont hébergées en France chez Scalingo, hébergeur certifié HDS. L'application et sa base de données tournent sur une infrastructure ouverte avec l'option HDS.",
            ],
          },
          {
            heading: "Qui voit les données d'un patient ?",
            paragraphs: ["Les règles sont appliquées par la base de données elle-même, pas seulement par l'affichage :"],
            bullets: [
              "le patient voit ses propres données, et son kiné celles de ses patients, jamais celles d'un autre kiné ;",
              "le patient donne son accord explicite au traitement de ses données de santé avant d'utiliser l'application ;",
              "il peut exporter ses données ou supprimer son compte depuis l'application ;",
              "les données servent uniquement au suivi : jamais revendues ni utilisées à des fins publicitaires.",
            ],
          },
          {
            heading: "Et pour le kiné ?",
            paragraphs: [
              "EasyPhysio est gratuit pour le kiné, sans abonnement ni limite de patients (voir le [comparatif des prix](/guides/comparatif-logiciel-exercices-kine)) : il compose des programmes à partir d'exercices filmés et suit l'assiduité et la douleur de ses patients. Cet article décrit le fonctionnement d'EasyPhysio ; ce n'est pas un conseil juridique.",
            ],
          },
        ],
      },
      en: {
        title: "Physio apps and health data: HDS hosting",
        description:
          "In France, a physio follow-up app must host health data with a certified HDS host. EasyPhysio hosts it in France with Scalingo, an HDS-certified host.",
        sections: [
          {
            heading: "Why a physio app must use HDS hosting",
            paragraphs: [
              "In France, health data entrusted to a provider must be hosted by a certified health-data host (HDS, Hébergeur de Données de Santé), under article L.1111-8 of the Public Health Code. An exercise follow-up app holds such data: pain scores, sessions done, the patient's situation, messages with the physio.",
            ],
          },
          {
            heading: "Where is EasyPhysio's data hosted?",
            paragraphs: [
              "EasyPhysio's health data is hosted in France with Scalingo, an HDS-certified host. The app and its database run on infrastructure set up with the HDS option.",
            ],
          },
          {
            heading: "Who sees a patient's data?",
            paragraphs: ["The rules are enforced by the database itself, not only by the screens:"],
            bullets: [
              "patients see their own data, and physios see their own patients' data, never another physio's;",
              "patients give explicit consent to the processing of their health data before using the app;",
              "they can export their data or delete their account from the app;",
              "the data is used only for follow-up: never sold or used for advertising.",
            ],
          },
          {
            heading: "And for the physio?",
            paragraphs: [
              "EasyPhysio is free for physiotherapists, with no subscription and no patient limit (see the [price comparison](/guides/comparatif-logiciel-exercices-kine)): they build programmes from filmed exercises and track their patients' adherence and pain. This article describes how EasyPhysio works; it is not legal advice.",
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
    updated: "2026-11-25",
    text: {
      fr: {
        title: "Exercices de kiné à la maison : l'appli qui vous guide",
        description:
          "Pour faire vos exercices de kiné à la maison, EasyPhysio vous guide séance par séance sur votre téléphone, et votre kiné suit vos progrès et votre douleur.",
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
              "L'application s'utilise sur invitation de votre kiné. Après {trial} jours offerts, le suivi coûte de {low} € à {high} € par mois pour l'accès à l'application selon l'engagement, plus le prix du programme fixé par votre kiné ({kine} € par défaut, parfois offert), versé à votre kiné les mois où il met à jour votre programme. Ce suivi n'est pas remboursé par l'Assurance Maladie, et vous pouvez l'arrêter à tout moment.",
            ],
          },
        ],
      },
      en: {
        title: "Physio exercises at home: the app that guides you",
        description:
          "To do your physio exercises at home, EasyPhysio guides you session by session on your phone, and your physio follows your progress and your pain.",
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
              "The app is used on your physio's invitation. After a {trial}-day free trial, follow-up costs €{low} to €{high} a month for app access depending on commitment, plus the programme price your physio sets (€{kine} by default, sometimes free), paid to your physio in months when they update your programme. In France it is not reimbursed by the national health insurance, and you can stop at any time.",
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
