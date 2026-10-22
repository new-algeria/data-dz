import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, CheckCircle2, FilePlus2, Loader2, RefreshCw, Search, Trash2, X } from "lucide-react";
import { MiseEnPage, Carte } from "@/components/MiseEnPage";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { ChampsProposition } from "@/components/propositions/ChampsProposition";
import { LigneFichier } from "@/components/propositions/LigneFichier";
import { ZoneDepot } from "@/components/propositions/ZoneDepot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import { cleErreur, cleErreurFichier } from "@/lib/erreurs";
import { valeursDepuisDonnee, valeursVides, validerValeurs, versChamps, type ValeursFormulaire } from "@/lib/formulaire-soumission";
import { estSynchronisee, rechercherDonnees, type DonneeModifiable } from "@/lib/referentiels";
import { routes } from "@/lib/routes";
import {
  creerSoumission,
  envoyerFichierSoumission,
  LIMITE_SOUMISSIONS_EN_COURS,
  MESSAGE_PROBLEME_FICHIER,
  nbSoumissionsEnCours,
  nomStocke,
  verifierFichier,
  type ProblemeFichier,
  type TypeSoumission,
} from "@/lib/soumissions";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const URL_SIGNALEMENT_GEOALGERIA = "https://github.com/yasserstudio/geoalgeria/issues";

interface FichierAEnvoyer {
  cle: string;
  fichier: File;
  probleme: ProblemeFichier | null;
}

/** Étape 1 (mise à jour) : chercher la donnée à mettre à jour. */
const ChoixDonnee = ({ surChoix }: { surChoix: (donnee: DonneeModifiable) => void }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [saisie, setSaisie] = useState("");
  const terme = useValeurDifferee(saisie.trim(), 300);
  const requete = useQuery({ queryKey: ["donnees-modifiables", terme], queryFn: () => rechercherDonnees(terme) });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={t("propositions.rechercheDonnee")}
          aria-label={t("propositions.rechercheDonnee")}
          className="ps-9"
          autoFocus
        />
      </div>
      {requete.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : requete.isError ? (
        <MessageAuth type="erreur">{t(cleErreur(requete.error))}</MessageAuth>
      ) : requete.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("propositions.aucuneDonnee")}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
          {requete.data.map((donnee) => {
            const synchronisee = estSynchronisee(donnee);
            return (
              <li key={donnee.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", synchronisee && "text-muted-foreground")}>{texteTraduit(donnee.titre, langue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {donnee.sources?.nom}
                    {synchronisee && ` · ${t("propositions.donneeSynchronisee")}`}
                  </p>
                </div>
                {synchronisee ? (
                  <Button asChild size="sm" variant="ghost" className="gap-1.5 text-amber-700 dark:text-amber-400">
                    <a href={URL_SIGNALEMENT_GEOALGERIA} target="_blank" rel="noopener noreferrer">
                      <Bug className="h-4 w-4" />
                      {t("propositions.signalerGeoalgeria")}
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => surChoix(donnee)}>
                    {t("propositions.choisir")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const Proposer = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { utilisateur } = useAuth();
  const clientRequetes = useQueryClient();

  const [type, setType] = useState<TypeSoumission | null>(null);
  const [donnee, setDonnee] = useState<DonneeModifiable | null>(null);
  const [valeurs, setValeurs] = useState<ValeursFormulaire>(valeursVides);
  const [fichiers, setFichiers] = useState<FichierAEnvoyer[]>([]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ id: string; echecs: string[] } | null>(null);

  const requeteEnCours = useQuery({ queryKey: ["nb-soumissions-en-cours", utilisateur?.id], queryFn: nbSoumissionsEnCours });
  const limiteAtteinte = (requeteEnCours.data ?? 0) >= LIMITE_SOUMISSIONS_EN_COURS;
  const formulaireVisible = type === "nouvelle_donnee" || (type === "mise_a_jour" && donnee !== null);

  const ajouterFichiers = (nouveaux: File[]) =>
    setFichiers((existants) => [
      ...existants,
      ...nouveaux.map((fichier) => ({ cle: `${fichier.name}-${fichier.size}-${fichier.lastModified}-${Math.random()}`, fichier, probleme: verifierFichier(fichier) })),
    ]);

  const choisirDonnee = (choisie: DonneeModifiable) => {
    setDonnee(choisie);
    setValeurs(valeursDepuisDonnee(choisie));
  };

  const recommencer = () => {
    setType(null);
    setDonnee(null);
    setValeurs(valeursVides());
    setFichiers([]);
    setErreur(null);
  };

  const envoyer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    const probleme = validerValeurs(valeurs);
    if (probleme) return setErreur(probleme);
    if (fichiers.some((f) => f.probleme)) return setErreur("erreurs.fichiersARetirer");
    if (!utilisateur || !type) return;

    setEnvoi(t("propositions.envoiEnCours"));
    try {
      // La base refuse aussi au-delà de 5 propositions en cours : on vérifie avant pour un message clair.
      if ((await nbSoumissionsEnCours()) >= LIMITE_SOUMISSIONS_EN_COURS) {
        setErreur("erreurs.limitePropositions");
        return;
      }
      const id = await creerSoumission(type, donnee?.id ?? null, versChamps(valeurs));

      const echecs: string[] = [];
      const noms: string[] = [];
      for (const { fichier } of fichiers) {
        setEnvoi(t("propositions.envoiFichier", { nom: fichier.name }));
        try {
          const envoye = await envoyerFichierSoumission(utilisateur.id, id, fichier, noms);
          noms.push(nomStocke(envoye.chemin_stockage));
        } catch (e) {
          echecs.push(`${fichier.name} : ${t(cleErreurFichier(e))}`);
        }
      }
      clientRequetes.invalidateQueries({ queryKey: ["mes-soumissions"] });
      clientRequetes.invalidateQueries({ queryKey: ["nb-soumissions-en-cours"] });
      clientRequetes.invalidateQueries({ queryKey: ["moderation"] });
      setResultat({ id, echecs });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErreur(cleErreur(e));
    } finally {
      setEnvoi(null);
    }
  };

  if (resultat) {
    return (
      <MiseEnPage titre={t("propositions.titrePage")} chemin={routes.proposer}>
        <Carte>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
            <h2 className="text-xl font-semibold">{t("propositions.succes")}</h2>
            <p className="max-w-md text-muted-foreground">{t("propositions.succesTexte")}</p>
          </div>
          {resultat.echecs.length > 0 && (
            <MessageAuth type="erreur">
              <p>{t("propositions.fichiersEchec", { count: resultat.echecs.length })}</p>
              <ul className="mt-1 list-disc ps-5">
                {resultat.echecs.map((echec) => (
                  <li key={echec}>{echec}</li>
                ))}
              </ul>
            </MessageAuth>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild className="bg-emerald-700 text-white hover:bg-emerald-800">
              <Link to={routes.maProposition(resultat.id)}>{t("propositions.voirProposition")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={routes.mesPropositions}>{t("propositions.mesTitre")}</Link>
            </Button>
          </div>
        </Carte>
      </MiseEnPage>
    );
  }

  return (
    <MiseEnPage
      titre={t("propositions.titrePage")}
      sousTitre={t("propositions.sousTitre")}
      chemin={routes.proposer}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={routes.mesPropositions}>{t("propositions.mesTitre")}</Link>
        </Button>
      }
    >
      {requeteEnCours.isPending ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : limiteAtteinte ? (
        <Carte>
          <MessageAuth type="erreur">
            {t("propositions.limite", { nombre: requeteEnCours.data, max: LIMITE_SOUMISSIONS_EN_COURS })}
          </MessageAuth>
          <Button asChild variant="outline" className="mt-4">
            <Link to={routes.mesPropositions}>{t("propositions.mesTitre")}</Link>
          </Button>
        </Carte>
      ) : !type ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(["nouvelle_donnee", "mise_a_jour"] as const).map((choix, indice) => (
            <motion.button
              key={choix}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: indice * 0.08 }}
              onClick={() => setType(choix)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-200/80 bg-white p-6 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:border-white/10 dark:bg-gray-800"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {choix === "nouvelle_donnee" ? <FilePlus2 className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
              </span>
              <span className="text-lg font-semibold">{t(`propositions.choix.${choix}.titre`)}</span>
              <span className="text-sm text-muted-foreground">{t(`propositions.choix.${choix}.texte`)}</span>
            </motion.button>
          ))}
        </div>
      ) : !formulaireVisible ? (
        <Carte titre={t("propositions.choix.mise_a_jour.titre")}>
          <Button type="button" variant="ghost" size="sm" className="mb-3 gap-1.5" onClick={recommencer}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("propositions.retourChoix")}
          </Button>
          <ChoixDonnee surChoix={choisirDonnee} />
        </Carte>
      ) : (
        <form onSubmit={envoyer} className="space-y-6" noValidate>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-500/10">
            <span>
              <span className="font-semibold">{t(`propositions.types.${type}`)}</span>
              {donnee && (
                <>
                  {" · "}
                  <Link to={routes.donnee(donnee.slug)} className="underline underline-offset-2" target="_blank">
                    {texteTraduit(donnee.titre, langue)}
                  </Link>
                </>
              )}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={recommencer} disabled={envoi !== null}>
              {t("propositions.changer")}
            </Button>
          </div>

          <Carte>
            <ChampsProposition valeurs={valeurs} onChange={(modification) => setValeurs((v) => ({ ...v, ...modification }))} />
          </Carte>

          <Carte titre={t("propositions.champs.fichiers")}>
            <div className="space-y-3">
              {fichiers.length > 0 && (
                <ul className="divide-y rounded-xl border bg-white dark:bg-gray-900">
                  {fichiers.map(({ cle, fichier, probleme }) => (
                    <LigneFichier
                      key={cle}
                      nom={fichier.name}
                      taille={fichier.size}
                      etat={probleme && <span className="text-red-600 dark:text-red-400">{t(MESSAGE_PROBLEME_FICHIER[probleme])}</span>}
                      actions={
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setFichiers((liste) => liste.filter((f) => f.cle !== cle))}
                          aria-label={t("propositions.champs.retirerFichier", { nom: fichier.name })}
                          disabled={envoi !== null}
                        >
                          {probleme ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      }
                    />
                  ))}
                </ul>
              )}
              <ZoneDepot surFichiers={ajouterFichiers} desactive={envoi !== null} />
            </div>
          </Carte>

          {erreur && (
            <MessageAuth type="erreur">
              {t(erreur, { max: LIMITE_SOUMISSIONS_EN_COURS })}
              {erreur === "erreurs.limitePropositions" && (
                <Link to={routes.mesPropositions} className="ms-1 font-semibold underline">
                  {t("propositions.mesTitre")}
                </Link>
              )}
            </MessageAuth>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={envoi !== null}>
              {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("propositions.envoyer")}
            </Button>
            {envoi && (
              <span className="text-sm text-muted-foreground" role="status">
                {envoi}
              </span>
            )}
          </div>
        </form>
      )}
    </MiseEnPage>
  );
};

export default Proposer;
