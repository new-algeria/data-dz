import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";

interface CadreAuthProps {
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  pied?: ReactNode;
}

/** Mise en page commune des pages de connexion, d'inscription et de mot de passe. */
export const CadreAuth = ({ titre, sousTitre, children, pied }: CadreAuthProps) => (
  <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
    <CustomMetaTags title={`${titre} - data-dz`} description={sousTitre ?? titre} />
    <Navbar />
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-16 pt-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 start-[-6rem] h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl animate-flotter dark:bg-emerald-600/15" />
        <div className="absolute bottom-0 end-[-4rem] h-72 w-72 rounded-full bg-teal-200/40 blur-3xl animate-flotter-lent dark:bg-teal-500/10" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8 dark:border-white/10 dark:bg-gray-800/90"
      >
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{titre}</h1>
        {sousTitre && <p className="mt-1.5 text-sm text-muted-foreground">{sousTitre}</p>}
        <div className="mt-6">{children}</div>
        {pied && <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm dark:border-white/10">{pied}</div>}
      </motion.div>
    </main>
    <Footer />
  </div>
);
