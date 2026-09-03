"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

export default function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || !!disabled;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
      {...rest}
    >
      {pending ? (pendingText ?? "…") : children}
    </button>
  );
}
