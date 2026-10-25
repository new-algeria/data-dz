import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FeatureCollection } from "geojson";
import { Loader2 } from "lucide-react";
import { Globe, type Couche } from "@/components/fiche/GlobeDonnees";
import { DEGRADE_VERT } from "@/lib/carte";
import { EtatErreur } from "@/components/EtatErreur";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChargementJSON } from "@/hooks/use-chargement-fichier";
import { useLangue } from "@/hooks/use-langue";
import { chargerFicheDonnee } from "@/lib/catalogue";
import {
  codeWilaya,
  libelleColonne,
  pointsDepuisLignes,
  premiereValeur,
  uniteDepuisMesure,
  valeursTemps,
  valeursWilayas,
  type Ligne,
  type VisuelCarte,
} from "@/lib/detecterVisuel";
import { localeNombres } from "@/lib/fichiers";
import { chargerWilayas } from "@/lib/referentiels";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

// Contours des 69 wilayas : fichier publié du jeu « Divisions administratives » (GeoAlgeria).
const SLUG_DIVISIONS = "divisions-administratives";
const FICHIER_CONTOURS = "wilaya-boundaries";
const VERT = "#059669";

interface CarteDepuisLignesProps {
  visuel: Exclude<VisuelCarte, { origine: "geojson" }>;
  lignes: Ligne[];
  hauteur: string;
}

/** Contours des wilayas (chargés une fois, gardés en mémoire comme les autres fichiers). */
function useContoursWilayas() {
  const fiche = useQuery({ queryKey: ["fiche", SLUG_DIVISIONS], queryFn: () => chargerFicheDonnee(SLUG_DIVISIONS), staleTime: Infinity });
  const fichier = fiche.data?.versions?.fichiers?.find(
    (element) => element.format.toLowerCase() === "geojson" && (element.nom ?? "").toLowerCase() === FICHIER_CONTOURS
  );
  const sources = useMemo(() => (fichier ? [{ url: fichier.url, taille: fichier.taille_octets }] : []), [fichier]);
  const chargement = useChargementJSON<FeatureCollection>(sources, Boolean(fichier));
  const erreur = fiche.isError || (fiche.isSuccess && !fichier) || chargement.statut === "erreur";
  return { contours: chargement.statut === "termine" ? chargement.donnees?.[0] ?? null : null, erreur };
}

/** Carte des wilayas : chaque wilaya colorée selon la mesure choisie, pour l'année choisie. */
const CarteWilayas = ({ visuel, lignes, hauteur }: { visuel: Extract<VisuelCarte, { genre: "wilayas" }>; lignes: Ligne[]; hauteur: string }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { contours, erreur } = useContoursWilayas();
  const { data: wilayas = [] } = useQuery({ queryKey: ["wilayas"], queryFn: chargerWilayas, staleTime: Infinity });
  const periodes = useMemo(() => (visuel.temps ? valeursTemps(lignes, visuel.temps) : []), [visuel, lignes]);
  const [mesure, setMesure] = useState(visuel.mesures[0]);
  // Par défaut, la période la plus récente.
  const [periode, setPeriode] = useState<string | null>(periodes[periodes.length - 1] ?? null);

  const format = useMemo(() => new Intl.NumberFormat(localeNombres(langue), { maximumFractionDigits: 2 }), [langue]);
  const unite = uniteDepuisMesure(mesure, premiereValeur(lignes, visuel.unite));

  // Nom de chaque wilaya : liste officielle traduite, sinon colonne du fichier, sinon le code.
  const noms = useMemo(() => {
    const parCode = new Map<string, string>();
    if (visuel.nom) for (const ligne of lignes) {
      const code = codeWilaya(ligne[visuel.code]);
      if (code && !parCode.has(code) && typeof ligne[visuel.nom] === "string") parCode.set(code, ligne[visuel.nom] as string);
    }
    for (const wilaya of wilayas) {
      const nom = texteTraduit(wilaya.nom, langue);
      if (nom) parCode.set(wilaya.code, nom);
    }
    return parCode;
  }, [visuel, lignes, wilayas, langue]);

  const valeurs = useMemo(() => valeursWilayas(lignes, visuel, { mesure, temps: periode }), [lignes, visuel, mesure, periode]);
  const min = Math.min(...valeurs.values());
  const max = Math.max(...valeurs.values());

  const couches = useMemo<Couche[]>(() => {
    if (!contours) return [];
    const donnees: FeatureCollection = {
      type: "FeatureCollection",
      features: contours.features.map((feature) => {
        const proprietes = feature.properties ?? {};
        const code = codeWilaya(proprietes.code ?? proprietes.wilaya_code ?? proprietes.code_wilaya ?? proprietes.id);
        const valeur = code ? valeurs.get(code) : undefined;
        const nom = (code && noms.get(code)) || code || "";
        return {
          ...feature,
          properties: {
            code,
            valeur: valeur ?? null,
            infobulle: valeur === undefined ? `${nom} : ${t("visuel.sansValeur")}` : `${nom} : ${format.format(valeur)}${unite ? ` ${unite}` : ""}`,
          },
        };
      }),
    };
    return [{ id: "wilayas", nom: libelleColonne(mesure), couleur: VERT, donnees, choroplethe: { min, max } }];
  }, [contours, valeurs, noms, format, unite, mesure, min, max, t]);

  if (erreur) return <EtatErreur message={t("fiche.carteErreur")} />;
  if (!contours) {
    return (
      <div className={cn("flex items-center justify-center gap-2 rounded-xl border bg-muted/40", hauteur)} role="status">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" aria-hidden />
        <span className="text-sm">{t("fiche.carteChargement")}</span>
      </div>
    );
  }

  const legende = (
    <div className="absolute bottom-2 start-2 w-44 rounded-lg bg-white/90 p-2 text-xs shadow-md backdrop-blur dark:bg-gray-900/90">
      <p className="mb-1 truncate font-semibold" dir="auto">
        {libelleColonne(mesure)}
        {periode ? ` · ${periode}` : ""}
      </p>
      <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${DEGRADE_VERT.join(", ")})` }} aria-hidden />
      <div className="mt-1 flex justify-between font-mono tabular-nums" dir="ltr">
        <span>{valeurs.size ? format.format(min) : "–"}</span>
        <span>{valeurs.size ? format.format(max) : "–"}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {(visuel.mesures.length > 1 || periodes.length > 1) && (
        <div className="flex flex-wrap items-center gap-2">
          {visuel.mesures.length > 1 && (
            <Select value={mesure} onValueChange={setMesure}>
              <SelectTrigger className="h-9 w-auto min-w-[12rem] max-w-full" aria-label={t("visuel.mesure")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visuel.mesures.map((nom) => (
                  <SelectItem key={nom} value={nom}>
                    {libelleColonne(nom)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {periodes.length > 1 && (
            <Select value={periode ?? undefined} onValueChange={setPeriode}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem]" aria-label={t("visuel.periode")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {[...periodes].reverse().map((valeur) => (
                  <SelectItem key={valeur} value={valeur}>
                    {valeur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <Globe couches={couches} hauteur={hauteur} enSurimpression={legende} projection="mercator" />
    </div>
  );
};

/** Carte construite à partir des lignes du JSON : points (latitude / longitude) ou wilayas colorées. */
const CarteDepuisLignes = ({ visuel, lignes, hauteur }: CarteDepuisLignesProps) => {
  const couches = useMemo<Couche[]>(
    () =>
      visuel.genre === "points"
        ? [{ id: visuel.fichierId, nom: visuel.fichierId, couleur: VERT, donnees: pointsDepuisLignes(lignes, visuel.latitude, visuel.longitude) }]
        : [],
    [visuel, lignes]
  );
  if (visuel.genre === "wilayas") return <CarteWilayas visuel={visuel} lignes={lignes} hauteur={hauteur} />;
  return <Globe couches={couches} hauteur={hauteur} projection="mercator" />;
};

export default CarteDepuisLignes;
