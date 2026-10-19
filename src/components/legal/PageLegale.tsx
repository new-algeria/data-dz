import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, Mail, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { useLangue } from "@/hooks/use-langue";
import { localeNombres } from "@/lib/fichiers";
import { EMAIL_CONTACT } from "@/lib/contact";

interface Section {
  id: string;
  titre: string;
  texte: string;
}

interface PageLegaleProps {
  /** Préfixe des traductions : `legal.confidentialite` ou `legal.conditions`. */
  cle: "confidentialite" | "conditions";
  chemin: string;
  /** Date de dernière mise à jour (AAAA-MM-JJ) : à changer à chaque modification du texte. */
  miseAJour: string;
}

/** Liens du texte : internes via le routeur, externes dans un nouvel onglet, mailto tels quels. */
const LienTexte = ({ href = "", children }: { href?: string; children?: React.ReactNode }) => {
  const classe = "font-medium text-emerald-700 underline underline-offset-2 hover:no-underline dark:text-emerald-400";
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={classe}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={classe}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classe}>
      {children}
    </a>
  );
};

export const PageLegale = ({ cle, chemin, miseAJour }: PageLegaleProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const sections = t(`legal.${cle}.sections`, { returnObjects: true }) as Section[];
  const date = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long" }).format(new Date(`${miseAJour}T12:00:00`));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags title={`${t(`legal.${cle}.titre`)} - data-dz`} description={t(`legal.${cle}.metaDescription`)} path={chemin} />
      <Navbar />

      <header className="relative overflow-hidden border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-16 dark:border-white/5 dark:from-[#03140f] dark:via-gray-900 dark:to-gray-900">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 end-[-6rem] h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl animate-flotter dark:bg-emerald-600/15" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative container mx-auto max-w-3xl px-4 py-12"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur dark:bg-white/5 dark:text-emerald-300">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {t("legal.miseAJour", { date })}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl dark:text-white">{t(`legal.${cle}.titre`)}</h1>
          <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-600/20 bg-white/80 p-4 text-gray-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-gray-200">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <p>
              <span className="font-semibold">{t("legal.enBref")}</span> {t(`legal.${cle}.resume`)}
            </p>
          </div>
        </motion.div>
      </header>

      <main className="container mx-auto max-w-3xl flex-1 px-4 py-10">
        <nav aria-label={t("legal.sommaire")} className="mb-8 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("legal.sommaire")}</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, indice) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex gap-2 text-gray-700 hover:text-emerald-700 dark:text-gray-300 dark:hover:text-emerald-400">
                  <span className="tabular-nums text-muted-foreground">{indice + 1}.</span>
                  {section.titre}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          {sections.map((section, indice) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`titre-${section.id}`}
              className="scroll-mt-24 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800"
            >
              <h2 id={`titre-${section.id}`} className="mb-3 flex items-baseline gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <span className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{indice + 1}.</span>
                {section.titre}
              </h2>
              <div className="space-y-3 leading-relaxed text-gray-700 dark:text-gray-300 [&_li]:ms-5 [&_li]:list-disc [&_li]:ps-1 [&_strong]:font-semibold [&_strong]:text-gray-900 dark:[&_strong]:text-white [&_ul]:space-y-1.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm">
                <Markdown remarkPlugins={[remarkGfm]} components={{ a: LienTexte }}>
                  {section.texte}
                </Markdown>
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-emerald-600/20 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-500/10">
          <p className="text-sm text-gray-700 dark:text-gray-200">{t("legal.question")}</p>
          <a
            href={`mailto:${EMAIL_CONTACT}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <Mail className="h-4 w-4" aria-hidden />
            <span dir="ltr">{EMAIL_CONTACT}</span>
          </a>
        </aside>
      </main>

      <Footer />
    </div>
  );
};
