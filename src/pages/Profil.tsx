import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, Check, ExternalLink, KeyRound, Loader2, Trash2, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { AvatarMembre } from "@/components/AvatarMembre";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexte/ContexteAuth";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import { cleErreur } from "@/lib/erreurs";
import {
  envoyerAvatar,
  FORMAT_PSEUDO,
  FORMAT_SITE_WEB,
  LONGUEUR_MAX_BIO,
  LONGUEUR_MAX_NOM,
  mettreAJourProfil,
  normaliserPseudo,
  normaliserSiteWeb,
  retirerAvatar,
  TAILLE_MAX_AVATAR,
  TYPES_AVATAR,
  verifierFichierAvatar,
  verifierPseudo,
  type EtatPseudo,
  type Profil as ProfilMembre,
} from "@/lib/profils";
import { cn } from "@/lib/utils";

const erreurParEtatPseudo: Record<Exclude<EtatPseudo, "valide">, string> = {
  format: "erreurs.pseudoInvalide",
  reserve: "erreurs.pseudoReserve",
  pris: "erreurs.pseudoPris",
};

const Carte = ({ titre, children }: { titre: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-gray-800">
    <h2 className="mb-5 text-lg font-semibold">{titre}</h2>
    {children}
  </section>
);

const Compteur = ({ valeur, max }: { valeur: number; max: number }) => (
  <span className={cn("text-xs tabular-nums", valeur > max ? "text-red-600" : "text-muted-foreground")}>
    {valeur} / {max}
  </span>
);

/** Photo de profil : envoi vers avatars/<uid>/, contrôle du type et de la taille avant l'envoi. */
const SectionAvatar = ({ profil }: { profil: ProfilMembre }) => {
  const { t } = useTranslation();
  const { rechargerProfil } = useAuth();
  const clientRequetes = useQueryClient();
  const champFichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState<"envoi" | "retrait" | null>(null);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; cle: string } | null>(null);

  const apresChangement = async (cle: string) => {
    await rechargerProfil();
    clientRequetes.invalidateQueries({ queryKey: ["membre"] });
    setMessage({ type: "succes", cle });
  };

  const choisirFichier = async (evenement: ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!fichier) return;
    setMessage(null);

    const probleme = verifierFichierAvatar(fichier);
    if (probleme) {
      setMessage({ type: "erreur", cle: probleme === "format" ? "erreurs.formatImage" : "erreurs.imageTropLourde" });
      return;
    }

    setEnvoi("envoi");
    try {
      await envoyerAvatar(profil.id, fichier, profil.avatar_url);
      await apresChangement("profil.avatarEnregistre");
    } catch (e) {
      setMessage({ type: "erreur", cle: cleErreur(e) });
    } finally {
      setEnvoi(null);
    }
  };

  const retirer = async () => {
    setMessage(null);
    setEnvoi("retrait");
    try {
      await retirerAvatar(profil.id, profil.avatar_url);
      await apresChangement("profil.avatarRetire");
    } catch (e) {
      setMessage({ type: "erreur", cle: cleErreur(e) });
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <Carte titre={t("profil.photo")}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative">
          <AvatarMembre profil={profil} className="h-24 w-24 text-2xl ring-4 ring-emerald-500/20" />
          {envoi && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40" aria-hidden>
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-start">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              ref={champFichier}
              type="file"
              accept={TYPES_AVATAR.join(",")}
              className="sr-only"
              onChange={choisirFichier}
              aria-label={t("profil.changerPhoto")}
              tabIndex={-1}
            />
            <Button type="button" variant="outline" className="gap-2" onClick={() => champFichier.current?.click()} disabled={envoi !== null}>
              <Camera className="h-4 w-4" />
              {t("profil.changerPhoto")}
            </Button>
            {profil.avatar_url && (
              <Button type="button" variant="ghost" className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400" onClick={retirer} disabled={envoi !== null}>
                <Trash2 className="h-4 w-4" />
                {t("profil.retirerPhoto")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("profil.photoAide", { taille: TAILLE_MAX_AVATAR / 1024 / 1024 })}</p>
        </div>
      </div>
      {message && (
        <div className="mt-4">
          <MessageAuth type={message.type}>{t(message.cle)}</MessageAuth>
        </div>
      )}
    </Carte>
  );
};

/** Indicateur en direct sous le champ pseudo. */
const EtatDuPseudo = ({ etat }: { etat: EtatPseudo | "verification" | null }) => {
  const { t } = useTranslation();
  if (!etat) return <p className="text-xs text-muted-foreground">{t("profil.pseudoAide")}</p>;
  if (etat === "verification") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {t("profil.pseudoVerification")}
      </p>
    );
  }
  const valide = etat === "valide";
  return (
    <p className={cn("flex items-center gap-1.5 text-xs", valide ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")} role="status">
      {valide ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
      {valide ? t("profil.pseudoDisponible") : t(erreurParEtatPseudo[etat])}
    </p>
  );
};

const FormulaireProfil = ({ profil }: { profil: ProfilMembre }) => {
  const { t } = useTranslation();
  const { rechargerProfil } = useAuth();
  const clientRequetes = useQueryClient();

  const [pseudo, setPseudo] = useState(profil.pseudo);
  const [nomAffiche, setNomAffiche] = useState(profil.nom_affiche ?? "");
  const [bio, setBio] = useState(profil.bio ?? "");
  const [siteWeb, setSiteWeb] = useState(profil.site_web ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; cle: string } | null>(null);

  // Vérification du pseudo pendant la saisie (format, nom réservé, disponibilité).
  const pseudoNormalise = normaliserPseudo(pseudo);
  const pseudoDiffere = useValeurDifferee(pseudoNormalise, 400);
  const pseudoChange = pseudoNormalise !== profil.pseudo;
  const formatPseudoOk = FORMAT_PSEUDO.test(pseudoNormalise);
  const requetePseudo = useQuery({
    queryKey: ["pseudo-disponible", pseudoDiffere, profil.id],
    queryFn: () => verifierPseudo(pseudoDiffere, profil.id),
    enabled: pseudoChange && formatPseudoOk && pseudoDiffere === pseudoNormalise,
    staleTime: 30 * 1000,
  });
  const etatPseudo: EtatPseudo | "verification" | null = !pseudoChange
    ? null
    : !formatPseudoOk
      ? "format"
      : pseudoDiffere !== pseudoNormalise || requetePseudo.isPending
        ? "verification"
        : (requetePseudo.data ?? null);

  const siteNormalise = normaliserSiteWeb(siteWeb);
  const siteInvalide = siteNormalise !== null && !FORMAT_SITE_WEB.test(siteNormalise);

  const champs = {
    pseudo: pseudoNormalise,
    nom_affiche: nomAffiche.trim() || null,
    bio: bio.trim() || null,
    site_web: siteNormalise,
  };
  const modifie =
    champs.pseudo !== profil.pseudo ||
    champs.nom_affiche !== profil.nom_affiche ||
    champs.bio !== profil.bio ||
    champs.site_web !== profil.site_web;
  const invalide =
    !formatPseudoOk ||
    (pseudoChange && etatPseudo !== "valide" && etatPseudo !== "verification") ||
    nomAffiche.trim().length > LONGUEUR_MAX_NOM ||
    bio.length > LONGUEUR_MAX_BIO ||
    siteInvalide;

  const enregistrer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setMessage(null);
    if (siteInvalide) return setMessage({ type: "erreur", cle: "erreurs.siteWebInvalide" });

    setEnvoi(true);
    try {
      // Nouvelle vérification juste avant l'envoi : le pseudo a pu être pris entre-temps.
      if (pseudoChange) {
        const etat = await verifierPseudo(champs.pseudo, profil.id);
        if (etat !== "valide") {
          setMessage({ type: "erreur", cle: erreurParEtatPseudo[etat] });
          return;
        }
      }
      await mettreAJourProfil(profil.id, champs);
      await rechargerProfil();
      clientRequetes.invalidateQueries({ queryKey: ["membre"] });
      setPseudo(champs.pseudo);
      setSiteWeb(champs.site_web ?? "");
      setMessage({ type: "succes", cle: "profil.enregistre" });
    } catch (e) {
      setMessage({ type: "erreur", cle: cleErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Carte titre={t("profil.informations")}>
      <form onSubmit={enregistrer} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="pseudo">{t("profil.pseudo")}</Label>
          <div className="relative" dir="ltr">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">@</span>
            <Input
              id="pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value.toLowerCase().replace(/\s/g, ""))}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              className="pl-7"
              aria-invalid={etatPseudo !== null && etatPseudo !== "valide" && etatPseudo !== "verification"}
            />
          </div>
          <EtatDuPseudo etat={etatPseudo} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="nom-affiche">{t("profil.nomAffiche")}</Label>
            <Compteur valeur={nomAffiche.trim().length} max={LONGUEUR_MAX_NOM} />
          </div>
          <Input id="nom-affiche" value={nomAffiche} onChange={(e) => setNomAffiche(e.target.value)} maxLength={LONGUEUR_MAX_NOM} autoComplete="name" dir="auto" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">{t("profil.bio")}</Label>
            <Compteur valeur={bio.length} max={LONGUEUR_MAX_BIO} />
          </div>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={LONGUEUR_MAX_BIO}
            rows={4}
            placeholder={t("profil.bioExemple")}
            dir="auto"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-web">{t("profil.siteWeb")}</Label>
          <Input
            id="site-web"
            value={siteWeb}
            onChange={(e) => setSiteWeb(e.target.value)}
            inputMode="url"
            autoComplete="url"
            placeholder="https://"
            dir="ltr"
            aria-invalid={siteInvalide}
          />
          {siteInvalide && <p className="text-xs text-red-600 dark:text-red-400">{t("erreurs.siteWebInvalide")}</p>}
        </div>

        {message && <MessageAuth type={message.type}>{t(message.cle)}</MessageAuth>}

        <Button type="submit" className="w-full bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto" disabled={envoi || !modifie || invalide}>
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("profil.enregistrer")}
        </Button>
      </form>
    </Carte>
  );
};

const Profil = () => {
  const { t } = useTranslation();
  const { profil, utilisateur, chargementProfil } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags title={`${t("profil.titre")} - data-dz`} description={t("profil.titre")} path="/profil" />
      <Navbar />
      <main className="container mx-auto max-w-3xl flex-1 px-4 pb-16 pt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("profil.titre")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("profil.sousTitre")}</p>
          </div>
          {profil && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={`/membres/${profil.pseudo}`}>
                <ExternalLink className="h-4 w-4" />
                {t("auth.maPagePublique")}
              </Link>
            </Button>
          )}
        </div>

        {chargementProfil || !profil ? (
          <div className="space-y-6" aria-busy="true">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <SectionAvatar profil={profil} />
            {/* La clé recrée le formulaire si le profil change d'identité (autre compte). */}
            <FormulaireProfil key={profil.id} profil={profil} />
            <Carte titre={t("profil.compte")}>
              <dl className="space-y-1 text-sm">
                <dt className="text-muted-foreground">{t("auth.email")}</dt>
                <dd className="font-medium" dir="ltr">
                  {utilisateur?.email}
                </dd>
              </dl>
              <Button asChild variant="outline" className="mt-4 gap-2">
                <Link to="/nouveau-mot-de-passe">
                  <KeyRound className="h-4 w-4" />
                  {t("profil.changerMotDePasse")}
                </Link>
              </Button>
            </Carte>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profil;
