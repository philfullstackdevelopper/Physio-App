"use client";

import { useEffect, useState } from "react";

// Starts at options[0] so the client's first render matches the server-rendered
// HTML exactly (no hydration mismatch), then swaps in a random pick after mount.
export default function RandomLine({ options }: { options: string[] }) {
  const [text, setText] = useState(options[0]);

  useEffect(() => {
    // Deliberate post-mount randomization, not derived state — no pure alternative.
    setText(options[Math.floor(Math.random() * options.length)]); // eslint-disable-line react-hooks/set-state-in-effect
  }, [options]);

  return <>{text}</>;
}
