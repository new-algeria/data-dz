import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ImageDown, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLangue } from "@/hooks/use-langue";
import {
  donneesBarres,
  donneesCourbe,
  libelleColonne,
  MESURES_COCHEES,
  optionsSeries,
  premiereValeur,
  titreCourbe,
  uniteDepuisMesure,
  type Ligne,
  type VisuelGraphique,
} from "@/lib/detecterVisuel";
import { telechargerGraphiquePng } from "@/lib/exporterImage";
import { localeNombres } from "@/lib/fichiers";
import { cn } from "@/lib/utils";

// Couleurs des séries, lisibles en clair comme en sombre (palette Tailwind du site).
const COULEURS = [
  { light: "#059669", dark: "#34d399" },
  { light: "#0284c7", dark: "#38bdf8" },
  { light: "#d97706", dark: "#fbbf24" },
  { light: "#db2777", dark: "#f472b6" },
  { light: "#7c3aed", dark: "#a78bfa" },
  { light: "#0891b2", dark: "#22d3ee" },
];
const couleur = (indice: number) => COULEURS[indice % COULEURS.length];

interface GraphiqueVisuelProps {
  visuel: VisuelGraphique;
  lignes: Ligne[];
  /** Titre du jeu, utilisé quand plusieurs mesures sont tracées ensemble. */
  titreJeu: string;
  source: string | null;
  slug: string;
  hauteur: string;
}

const useFormats = () => {
  const langue = useLangue();
  return useMemo(() => {
    const locale = localeNombres(langue);
    const precis = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    return { precis: (valeur: number) => precis.format(valeur), compact: (valeur: number) => compact.format(valeur) };
  }, [langue]);
};

interface EntreeInfobulle {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

/** Info-bulle : période, puis chaque série avec sa valeur et son unité (une seule fois au raccord observé / projeté). */
const Infobulle = ({
  active,
  payload,
  label,
  libelles,
  unite,
}: {
  active?: boolean;
  payload?: EntreeInfobulle[];
  label?: string | number;
  libelles: Record<string, string>;
  unite: string | null;
}) => {
  const { t } = useTranslation();
  const { precis } = useFormats();
  if (!active || !payload?.length) return null;
  const vues = new Set<string>();
  const lignes = payload.flatMap((entree) => {
    const cle = String(entree.dataKey ?? "");
    const base = cle.replace(/_p$/, "");
    if (typeof entree.value !== "number" || vues.has(base)) return [];
    vues.add(base);
    return [{ base, projete: cle.endsWith("_p") && !payload.some((autre) => autre.dataKey === base), valeur: entree.value, couleur: entree.color }];
  });
  return (
    <div className="min-w-[10rem] rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {lignes.map((ligne) => (
        <p key={ligne.base} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ligne.couleur }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {libelles[ligne.base]}
            {ligne.projete && ` (${t("visuel.projection").toLowerCase()})`}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {precis(ligne.valeur)}
            {unite ? ` ${unite}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
};

/** Courbe (séries dans le temps, partie projetée en pointillés) ou barres horizontales (top 15). */
const GraphiqueVisuel = ({ visuel, lignes, titreJeu, source, slug, hauteur }: GraphiqueVisuelProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const rtl = langue === "ar";
  const { compact } = useFormats();
  const id = useId();
  const zone = useRef<HTMLDivElement>(null);
  const [export_, setExport] = useState(false);

  const series = useMemo(() => (visuel.genre === "courbe" ? optionsSeries(lignes, visuel.dimensions, langue) : []), [visuel, lignes, langue]);
  const [serie, setSerie] = useState<string | null>(series[0]?.cle ?? null);
  const [cochees, setCochees] = useState<string[]>(visuel.mesures.slice(0, MESURES_COCHEES));
  const [mesure, setMesure] = useState(visuel.mesures[0]);

  const courbe = useMemo(
    () => (visuel.genre === "courbe" ? donneesCourbe(lignes, visuel, { serie, mesures: visuel.mesures.filter((nom) => cochees.includes(nom)) }) : null),
    [visuel, lignes, serie, cochees]
  );
  const barres = useMemo(() => (visuel.genre === "barres" ? donneesBarres(lignes, visuel.categorie, mesure) : []), [visuel, lignes, mesure]);

  let titre: string;
  let unite: string | null;
  if (courbe) {
    const nom =
      visuel.genre === "courbe" && visuel.dimensions.length > 0 && serie
        ? serie
        : courbe.series.length === 1
          ? courbe.series[0].libelle
          : titreJeu;
    titre = titreCourbe(nom, courbe.periode);
    unite = courbe.series.length === 1 ? uniteDepuisMesure(courbe.series[0].mesure, courbe.unite) : courbe.unite;
  } else {
    titre = t("visuel.titreBarres", { mesure: libelleColonne(mesure), nombre: barres.length });
    unite = uniteDepuisMesure(mesure, premiereValeur(lignes, visuel.unite));
  }

  const config = useMemo<ChartConfig>(() => {
    if (courbe) {
      // Format long avec une seule mesure (« valeur ») : la série porte le nom choisi (« Dette publique brute »).
      const nomSerie = (libelle: string) => (visuel.genre === "courbe" && visuel.dimensions.length > 0 && serie && courbe.series.length === 1 ? serie : libelle);
      return Object.fromEntries(
        courbe.series.flatMap((element, indice) => [
          [element.cle, { label: nomSerie(element.libelle), theme: couleur(indice) }],
          [`${element.cle}_p`, { label: nomSerie(element.libelle), theme: couleur(indice) }],
        ])
      );
    }
    return { valeur: { label: libelleColonne(mesure), theme: couleur(0) } };
  }, [courbe, mesure, visuel, serie]);
  const libelles = Object.fromEntries(Object.entries(config).map(([cle, valeur]) => [cle, String(valeur.label ?? cle)]));

  const exporter = async () => {
    const svg = zone.current?.querySelector<SVGSVGElement>("svg.recharts-surface");
    if (!svg) return;
    setExport(true);
    try {
      const sombre = document.documentElement.classList.contains("dark");
      await telechargerGraphiquePng(svg, `${slug}-graphique`, {
        titre,
        source: source ? t("visuel.source", { source }) : null,
        fond: sombre ? "#111827" : "#ffffff",
        texte: sombre ? "#f3f4f6" : "#111827",
        rtl,
      });
    } finally {
      setExport(false);
    }
  };

  const aProjection = Boolean(courbe?.series.some((element) => element.aProjection));
  const vide = courbe ? courbe.points.length === 0 || courbe.series.length === 0 : barres.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="me-auto min-w-0 text-base font-semibold leading-snug" dir="auto">
          {titre}
        </h3>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={exporter} disabled={export_ || vide}>
          {export_ ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImageDown className="h-4 w-4" aria-hidden />}
          {t("visuel.telechargerImage")}
        </Button>
      </div>

      {/* Choix de la série (format long) et des mesures (format large) */}
      {(series.length > 1 || visuel.mesures.length > 1) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {series.length > 1 && (
            <Select value={serie ?? undefined} onValueChange={setSerie}>
              <SelectTrigger className="h-9 w-auto min-w-[12rem] max-w-full" aria-label={t("visuel.serie")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {series.map((option) => (
                  <SelectItem key={option.cle} value={option.cle}>
                    <span dir="auto">{option.libelle}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {visuel.genre === "courbe" && visuel.mesures.length > 1 && (
            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <legend className="sr-only">{t("visuel.mesures")}</legend>
              {visuel.mesures.map((nom, indice) => {
                const coche = cochees.includes(nom);
                return (
                  <div key={nom} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`${id}-${indice}`}
                      checked={coche}
                      onCheckedChange={(valeur) =>
                        setCochees((liste) => (valeur ? visuel.mesures.filter((element) => element === nom || liste.includes(element)) : liste.filter((element) => element !== nom)))
                      }
                      disabled={coche && cochees.length === 1}
                    />
                    <Label htmlFor={`${id}-${indice}`} className="cursor-pointer text-sm font-normal" dir="auto">
                      {libelleColonne(nom)}
                    </Label>
                  </div>
                );
              })}
            </fieldset>
          )}
          {visuel.genre === "barres" && visuel.mesures.length > 1 && (
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
        </div>
      )}

      <div ref={zone}>
        {vide ? (
          <p className={cn("flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground", hauteur)}>{t("visuel.aucuneValeur")}</p>
        ) : courbe ? (
          <ChartContainer config={config} className={cn("aspect-auto w-full", hauteur)}>
            <LineChart data={courbe.points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="temps" reversed={rtl} tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
              <YAxis orientation={rtl ? "right" : "left"} tickLine={false} axisLine={false} width={56} tickFormatter={(valeur: number) => compact(valeur)} />
              <ChartTooltip content={<Infobulle libelles={libelles} unite={unite} />} />
              {courbe.series.flatMap((element) => [
                <Line key={element.cle} dataKey={element.cle} type="monotone" stroke={`var(--color-${element.cle})`} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />,
                element.aProjection && (
                  <Line
                    key={`${element.cle}_p`}
                    dataKey={`${element.cle}_p`}
                    type="monotone"
                    stroke={`var(--color-${element.cle}_p)`}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ),
              ])}
            </LineChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={config} className={cn("aspect-auto w-full", hauteur)}>
            <BarChart data={barres} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" reversed={rtl} tickLine={false} axisLine={false} tickFormatter={(valeur: number) => compact(valeur)} />
              <YAxis
                type="category"
                dataKey="categorie"
                orientation={rtl ? "right" : "left"}
                tickLine={false}
                axisLine={false}
                width={120}
                interval={0}
                tick={{ fontSize: 11 }}
                tickFormatter={(valeur: string) => (valeur.length > 18 ? `${valeur.slice(0, 17)}…` : valeur)}
              />
              <ChartTooltip cursor={{ fillOpacity: 0.08 }} content={<Infobulle libelles={libelles} unite={unite} />} />
              <Bar dataKey="valeur" fill="var(--color-valeur)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* Légende : séries, et pointillés pour la partie projetée */}
      {courbe && (courbe.series.length > 1 || aProjection) && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("visuel.legende")}>
          {courbe.series.length > 1 &&
            courbe.series.map((element, indice) => (
              <li key={element.cle} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: couleur(indice).light }} aria-hidden />
                <span dir="auto">{element.libelle}</span>
              </li>
            ))}
          {aProjection && (
            <li className="flex items-center gap-1.5">
              <span className="w-5 border-t-2 border-dashed border-current" aria-hidden />
              {t("visuel.projection")}
            </li>
          )}
        </ul>
      )}
      {unite && <p className="sr-only">{t("visuel.unite", { unite })}</p>}
    </div>
  );
};

export default GraphiqueVisuel;
