"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { initials } from "@/lib/format/initials";

/**
 * La bulle d'initiales en haut à droite du téléphone : un toucher ouvre un
 * petit menu avec le nom et « Se déconnecter » (Philippe, 2026-10-10 : même
 * geste pour le patient que pour le kiné — DashboardSidebar a son équivalent,
 * AccountMenu). Se ferme au toucher en dehors ou avec Échap.
 */
export default function PhoneAccountMenu({ name, role }: { name: string | null; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Mon compte (${name ?? role})`}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
      >
        {initials(name)}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-line/70">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name ?? role}</p>
            <p className="text-xs text-muted">{role}</p>
          </div>
          <SignOutButton redirectUrl="/login">
            <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-danger">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-soft">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </span>
              Se déconnecter
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
