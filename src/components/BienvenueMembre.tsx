import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DrapeauAlgerie } from "@/components/DrapeauAlgerie";
import { useAuth } from "@/contexte/ContexteAuth";
import { cleBienvenue, estNouveauCompte, modeBienvenue, prenomBienvenue } from "@/lib/bienvenue";
import { feterTelechargement } from "@/lib/confettis";
import { routes } from "@/lib/routes";

/** Comptes déjà accueillis pendant la visite, si le navigateur bloque le stockage. */
const accueillisSansStockage = new Set<string>();

function dejaAccueilli(id: string): boolean {
  if (accueillisSansStockage.has(id)) return true;
  try {
    return window.localStorage.getItem(cleBienvenue(id)) !== null;
  } catch {
    return false;
  }
}

function noterAccueilli(id: string) {
  accueillisSansStockage.add(id);
  try {
    window.localStorage.setItem(cleBienvenue(id), new Date().toISOString());
  } catch {
    // Stockage bloqué : l'accueil ne revient pas pendant la visite.
  }
}

/**
 * Accueil d'un nouveau membre, une seule fois (voir src/lib/bienvenue.ts) : fenêtre avec le fennec et les confettis
 * sur une page neutre, simple message s'il s'est inscrit pour télécharger, pour DjazAI ou pour proposer une donnée.
 */
export const BienvenueMembre = () => {
  const { t } = useTranslation();
  const { utilisateur, profil, chargement } = useAuth();
  const { pathname, search } = useLocation();
  const naviguer = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const traite = useRef<string | null>(null);

  useEffect(() => {
    if (chargement || !utilisateur || traite.current === utilisateur.id) return;
    if (!estNouveauCompte(utilisateur) || dejaAccueilli(utilisateur.id)) return;
    const mode = modeBienvenue(pathname, search);
    if (!mode) return;
    // Le prénom vient du profil : on attend qu'il soit chargé (le nom donné par Google suffit sinon).
    const nom = prenomBienvenue(profil, utilisateur);
    if (!profil && !nom) return;

    traite.current = utilisateur.id;
    noterAccueilli(utilisateur.id);
    setPrenom(nom);
    if (mode === "fenetre") {
      setOuvert(true);
      window.setTimeout(() => void feterTelechargement(), 350);
    } else {
      const cle = mode === "message-telechargement" ? "bienvenue.messageTelechargement" : "bienvenue.message";
      toast.success(nom ? t(cle, { prenom: nom }) : t(`${cle}SansPrenom`), { duration: 6000 });
    }
  }, [chargement, utilisateur, profil, pathname, search, t]);

  const explorer = () => {
    setOuvert(false);
    naviguer(`${routes.accueil}#catalog`);
  };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent
        // Le focus va sur la fenêtre elle-même (lue par les lecteurs d'écran) plutôt que sur le bouton, entouré sinon d'un contour.
        onOpenAutoFocus={(evenement) => {
          evenement.preventDefault();
          (evenement.currentTarget as HTMLElement | null)?.focus();
        }}
        className="outline-none max-w-[calc(100vw-2rem)] gap-0 overflow-visible rounded-[28px] sm:rounded-[28px] border-border px-6 pb-6 pt-24 text-center sm:max-w-[460px] sm:px-9 [&>button:last-child]:hidden">
        {/* Drapeau de l'Algérie penché sur le coin haut de la carte (côté hampe : à gauche, à droite en arabe). */}
        <DrapeauAlgerie className="pointer-events-none absolute -top-6 start-6 h-10 w-[60px] -rotate-12 rounded-md shadow-lg rtl:rotate-12 sm:-top-7 sm:start-8 sm:h-12 sm:w-[72px]" />
        <img
          src="/mascotte/fennec.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 w-28 -translate-x-1/2 drop-shadow-xl motion-safe:animate-[bienvenue-saut_0.9s_cubic-bezier(.3,1.6,.5,1)_both_0.2s] sm:-top-24 sm:w-32"
        />
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 rtl:tracking-normal dark:text-emerald-400">
          {t("bienvenue.choix")}
        </p>
        <DialogTitle className="mb-4 text-[clamp(2.5rem,10vw,3.5rem)] font-extrabold leading-[1.02] tracking-tight">
          {t("bienvenue.titre")}
          {prenom && (
            <span className="block text-emerald-700 dark:text-emerald-400" dir="auto">
              {prenom}
            </span>
          )}
        </DialogTitle>
        <DialogDescription className="mx-auto mb-7 max-w-[34ch] text-base leading-relaxed text-muted-foreground sm:text-[17px]">
          {t("bienvenue.texte")}
        </DialogDescription>
        <button
          type="button"
          onClick={explorer}
          className="w-full rounded-2xl bg-emerald-800 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {t("bienvenue.bouton")}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="mx-auto mt-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("bienvenue.plusTard")}
        </button>
      </DialogContent>
    </Dialog>
  );
};
