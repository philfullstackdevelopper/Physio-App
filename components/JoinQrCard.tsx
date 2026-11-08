import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { joinCodeFor } from "@/lib/patient/joinLink";
import { requestOrigin } from "@/lib/requestOrigin";
import { getTranslations } from "next-intl/server";

// QR code personnel du kiné (Philippe, 2026-11-04) : ses patients le scannent
// au cabinet et arrivent sur /rejoindre/<code> pour recevoir leur invitation.
// Dessiné côté serveur (bibliothèque qrcode) ; téléchargeable pour l'imprimer.
export default async function JoinQrCard({
  instructorId,
  open,
  demoPath,
}: {
  instructorId: string;
  open: boolean;
  /** Démo publique : le QR code mène à cette page de démo, pas à une vraie inscription. */
  demoPath?: string;
}) {
  const origin = await requestOrigin();
  const t = await getTranslations("dashboard.joinQr");
  const url = demoPath ? `${origin}${demoPath}` : `${origin}/rejoindre/${joinCodeFor(instructorId)}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f2a5c", light: "#ffffff" } });
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <section className="mt-4 rounded-xl border border-line bg-surface p-6 max-sm:rounded-2xl max-sm:border-0 max-sm:p-5 max-sm:shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <QrCode className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t("intro")}
      </p>
      <div className={`mt-4 flex items-center gap-4 max-sm:flex-col ${open ? "" : "opacity-50"}`}>
        <div
          role="img"
          aria-label={t("aria")}
          className="h-36 w-36 shrink-0 rounded-lg border border-line bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all rounded-lg bg-app-bg px-3 py-2 text-xs text-ink select-all">{url}</p>
          <a
            href={download}
            download="easyphysio-qr-code.svg"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-soft"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            {t("download")}
          </a>
        </div>
      </div>
      {!open && <p className="mt-3 text-xs text-muted">{t("atLaunch")}</p>}
    </section>
  );
}
