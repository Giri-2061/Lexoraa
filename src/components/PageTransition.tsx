import { ReactNode } from "react";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 20, scaleY: 0.98 },
  enter: { opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, scaleY: 0.995, transition: { duration: 0.25, ease: "easeIn" } }
};

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ willChange: "transform, opacity" }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}
