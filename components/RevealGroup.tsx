"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// Like Reveal, but for a group of siblings (stat cards, steps, feature
// tiles): each child eases in slightly after the previous one instead of
// the whole block moving as one piece — the "things emerging one after
// another" feel Philippe pointed to on adwize.ai.
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

// `as` lets a group render as something other than a div — e.g. "tbody"/"tr"
// so it stays valid inside a <table>.
export default function RevealGroup({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: keyof typeof motion;
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={container}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: keyof typeof motion;
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag className={className} variants={item}>
      {children}
    </MotionTag>
  );
}
