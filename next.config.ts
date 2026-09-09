import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'indicateur de dev de Next (bouton « N » en bas à gauche) recouvrait
  // « Se déconnecter » dans la sidebar du dashboard.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
