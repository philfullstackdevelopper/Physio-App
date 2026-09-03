const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "EasyPhysio",
  tagline: "La rééducation continue entre deux séances",
  description:
    "EasyPhysio relie les kinésithérapeutes et leurs patients : programmes d'exercices sur mesure, séances guidées en vidéo et suivi de progression entre deux rendez-vous.",
  url: rawUrl.replace(/\/$/, ""),
};
