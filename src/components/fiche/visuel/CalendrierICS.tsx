import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Fichier } from "@/lib/types";

const FUSEAU = "Africa/Algiers";
const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: FUSEAU });
const JOURS = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: FUSEAU });
const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU });

interface EvenementICS {
  id: string;
  titre: string;
  debut: Date;
  fin: Date;
  dateDebut: string;
  dateFinExclusive: string;
  journeeEntiere: boolean;
  description: string;
  url: string | null;
  tentative: boolean;
}

interface DateICS { date: Date; jour: string; journeeEntiere: boolean }

const dechapper = (texte: string) => texte.replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");

function daterLignes(contenu: string): string[] {
  return contenu.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).filter(Boolean);
}

function lireDate(valeur: string, parametres: string): DateICS | null {
  const dateSeule = /(?:^|;)VALUE=DATE(?:;|$)/i.test(`;${parametres};`) || /^\d{8}$/.test(valeur);
  const correspondance = dateSeule
    ? /^(\d{4})(\d{2})(\d{2})$/.exec(valeur)
    : /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(valeur);
  if (!correspondance) return null;
  const [, annee, mois, jour, h = "00", m = "00", s = "00", utc] = correspondance;
  const numero = [annee, mois, jour, h, m, s].map(Number);
  const [a, mo, j, hh, mm, ss] = numero;
  const instantLocal = Date.UTC(a, mo - 1, j, hh, mm, ss);
  if (
    [a, mo, j, hh, mm, ss].some((n) => !Number.isFinite(n)) ||
    mo < 1 || mo > 12 || j < 1 || j > 31 || hh > 23 || mm > 59 || ss > 59 ||
    new Date(instantLocal).getUTCFullYear() !== a || new Date(instantLocal).getUTCMonth() !== mo - 1 || new Date(instantLocal).getUTCDate() !== j
  ) return null;
  const cleJour = `${annee}-${mois}-${jour}`;
  if (dateSeule) return { date: new Date(instantLocal), jour: cleJour, journeeEntiere: true };
  if (utc) {
    const date = new Date(instantLocal);
    return { date, jour: formatPartsJour(date), journeeEntiere: false };
  }

  // Les heures sans suffixe Z sont flottantes, ou propres au TZID. Elles sont ramenées à l'heure d'Alger.
  const tzid = /(?:^|;)TZID="?([^;:"]+)/i.exec(parametres)?.[1] ?? FUSEAU;
  const fuseauSource = (() => {
    try { new Intl.DateTimeFormat("en", { timeZone: tzid }); return tzid; }
    catch { return FUSEAU; }
  })();
  const formatParts = (date: Date, timeZone: string) =>
    Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
  // Itération courte pour convertir une heure murale dans son fuseau (y compris le décalage saisonnier).
  let instant = instantLocal;
  for (let i = 0; i < 3; i++) {
    const parts = formatParts(new Date(instant), fuseauSource);
    const rendu = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    instant += instantLocal - rendu;
  }
  const date = new Date(instant);
  const partsAlger = formatParts(date, FUSEAU);
  return { date, jour: `${partsAlger.year}-${partsAlger.month}-${partsAlger.day}`, journeeEntiere: false };
}

function dureeICS(valeur: string, debut: Date): Date | null {
  const parts = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(valeur);
  if (!parts) return null;
  const [, semaines = "0", jours = "0", heures = "0", minutes = "0", secondes = "0"] = parts;
  const ms = (((Number(semaines) * 7 + Number(jours)) * 24 + Number(heures)) * 60 + Number(minutes)) * 60_000 + Number(secondes) * 1_000;
  return new Date(debut.getTime() + ms);
}

function lireEvenements(texte: string): EvenementICS[] {
  if (!/BEGIN:VCALENDAR/i.test(texte)) throw new Error("no-calendar");
  const lignes = daterLignes(texte);
  const blocs: string[][] = [];
  let bloc: string[] | null = null;
  for (const ligne of lignes) {
    if (/^BEGIN:VEVENT\s*$/i.test(ligne)) { bloc = []; continue; }
    if (/^END:VEVENT\s*$/i.test(ligne)) { if (bloc) blocs.push(bloc); bloc = null; continue; }
    if (bloc) bloc.push(ligne);
  }
  const evenements = blocs.flatMap((lignesBloc, index): EvenementICS[] => {
    const proprietes = new Map<string, { valeur: string; parametres: string }>();
    for (const ligne of lignesBloc) {
      const separateur = ligne.indexOf(":");
      if (separateur < 0) continue;
      const [nom, ...parametres] = ligne.slice(0, separateur).split(";");
      proprietes.set(nom.toUpperCase(), { valeur: ligne.slice(separateur + 1), parametres: parametres.join(";") });
    }
    const debutBrut = proprietes.get("DTSTART");
    if (!debutBrut) return [];
    const debut = lireDate(debutBrut.valeur, debutBrut.parametres);
    if (!debut) return [];
    const finBrute = proprietes.get("DTEND");
    const fin = finBrute ? lireDate(finBrute.valeur, finBrute.parametres) : null;
    const finDuree = !fin && proprietes.get("DURATION") ? dureeICS(proprietes.get("DURATION")!.valeur, debut.date) : null;
    const debutJourUTC = new Date(`${debut.jour}T00:00:00Z`);
    const finJour = fin?.jour ?? (finDuree ? formatPartsJour(finDuree) : debut.jour);
    const jourEntier = debut.journeeEntiere;
    const finExclusive = jourEntier
      ? fin?.jour ?? (finDuree ? finJour : ajouterJours(debutJourUTC, 1).toISOString().slice(0, 10))
      : finJour;
    const titre = dechapper(proprietes.get("SUMMARY")?.valeur ?? "").trim();
    const description = dechapper(proprietes.get("DESCRIPTION")?.valeur ?? "").trim();
    const lien = proprietes.get("URL")?.valeur.trim() ?? "";
    const statut = proprietes.get("STATUS")?.valeur.toUpperCase();
    return [{
      id: proprietes.get("UID")?.valeur || `${debut.jour}-${index}`,
      titre,
      debut: jourEntier ? debutJourUTC : debut.date,
      fin: fin?.date ?? finDuree ?? debut.date,
      dateDebut: debut.jour,
      dateFinExclusive: finExclusive,
      journeeEntiere: jourEntier,
      description,
      url: /^https?:\/\//i.test(lien) ? lien : null,
      tentative: statut === "TENTATIVE",
    }];
  });
  if (!evenements.length) throw new Error("no-events");
  return evenements.sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

function formatPartsJour(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const jourCle = (annee: number, mois: number, jour: number) => `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
const debutMois = (cle: string) => new Date(`${cle.slice(0, 7)}-01T00:00:00Z`);
const ajouterJours = (date: Date, jours: number) => new Date(date.getTime() + jours * 86_400_000);

function dernierJour(evenement: EvenementICS): string {
  if (evenement.journeeEntiere) return ajouterJours(new Date(`${evenement.dateFinExclusive}T00:00:00Z`), -1).toISOString().slice(0, 10);
  const finJour = formatPartsJour(evenement.fin);
  const finHeure = HEURE.format(evenement.fin);
  const minuit = /00:00/.test(finHeure);
  return finJour > evenement.dateDebut && minuit ? ajouterJours(new Date(`${finJour}T00:00:00Z`), -1).toISOString().slice(0, 10) : finJour;
}

function chevaucheJour(evenement: EvenementICS, jour: string): boolean {
  return evenement.dateDebut <= jour && dernierJour(evenement) >= jour;
}

function dureeTexte(evenement: EvenementICS): string {
  if (evenement.journeeEntiere) {
    const nombre = Math.max(1, (Date.parse(`${evenement.dateFinExclusive}T00:00:00Z`) - Date.parse(`${evenement.dateDebut}T00:00:00Z`)) / 86_400_000);
    return `${nombre} ${nombre > 1 ? "jours" : "jour"}`;
  }
  const minutes = Math.max(0, Math.round((evenement.fin.getTime() - evenement.debut.getTime()) / 60_000));
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} j ${Math.floor((minutes % 1440) / 60)} h`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  return `${minutes} min`;
}

const dateAffichee = (evenement: EvenementICS) => {
  if (evenement.journeeEntiere) {
    const dateFin = ajouterJours(new Date(`${evenement.dateFinExclusive}T00:00:00Z`), -1);
    const fin = formatPartsJour(dateFin);
    if (fin === evenement.dateDebut) return DATE_LONGUE.format(new Date(`${evenement.dateDebut}T00:00:00Z`));
    return `${DATE_LONGUE.format(new Date(`${evenement.dateDebut}T00:00:00Z`))} – ${DATE_LONGUE.format(dateFin)}`;
  }
  return `${DATE_LONGUE.format(evenement.debut)} · ${HEURE.format(evenement.debut)} – ${HEURE.format(evenement.fin)}`;
};

function moisCourant(): Date {
  const jour = formatPartsJour(new Date());
  return debutMois(jour);
}

export default function CalendrierICS({ fichier, source, sourceUrl, onNombreEvenementsChange }: { fichier: Fichier; source: string | null; sourceUrl?: string | null; onNombreEvenementsChange?: (nombre: number | null) => void }) {
  const { t } = useTranslation();
  const [evenements, setEvenements] = useState<EvenementICS[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [mois, setMois] = useState(moisCourant);
  const [chargement, setChargement] = useState(true);
  const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementICS | null>(null);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    onNombreEvenementsChange?.(null);
    fetch(fichier.url)
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error("download");
        const type = reponse.headers.get("content-type")?.toLowerCase() ?? "";
        const texte = await reponse.text();
        if (type.includes("text/calendar") || /BEGIN:VCALENDAR/i.test(texte)) return lireEvenements(texte);
        throw new Error("not-ics");
      })
      .then((resultat) => { if (!annule) { setEvenements(resultat); setErreur(false); onNombreEvenementsChange?.(resultat.length); } })
      .catch(() => { if (!annule) { setEvenements(null); setErreur(true); onNombreEvenementsChange?.(null); } })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [fichier.url, onNombreEvenementsChange]);

  const moisSuivant = useMemo(() => new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() + 1, 1)), [mois]);
  const cellules = useMemo(() => {
    const premier = new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth(), 1));
    const decalage = (premier.getUTCDay() + 6) % 7;
    const nombre = new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() + 1, 0)).getUTCDate();
    const lignes = Math.ceil((decalage + nombre) / 7) * 7;
    return Array.from({ length: lignes }, (_, index) => {
      const date = ajouterJours(premier, index - decalage);
      return { date, cle: jourCle(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), dansMois: date.getUTCMonth() === mois.getUTCMonth() };
    });
  }, [mois]);

  const joursSemaine = Array.from({ length: 7 }, (_, index) => JOURS.format(new Date(Date.UTC(2024, 0, 1 + index))));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><CalendarDays className="h-5 w-5" aria-hidden /></span>
        <h2 className="text-lg font-semibold">{t("visuel.calendrier.titre")}</h2>
        {!chargement && !erreur && evenements && (
          <span className="ms-auto rounded-full bg-muted px-2.5 py-1 text-sm font-medium" aria-live="polite">
            {t("visuel.calendrier.resume", { count: evenements.length })}
          </span>
        )}
      </div>

      {chargement ? <p className="py-10 text-center text-sm text-muted-foreground" role="status">{t("visuel.calendrier.chargement")}</p> : erreur ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>{t("visuel.calendrier.erreur")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" onClick={() => setMois(new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() - 1, 1)))} aria-label={t("visuel.calendrier.moisPrecedent")}><ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /></Button>
            <h3 className="text-base font-semibold capitalize" aria-live="polite">{MOIS.format(mois)}</h3>
            <Button variant="outline" size="icon" onClick={() => setMois(moisSuivant)} aria-label={t("visuel.calendrier.moisSuivant")}><ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></Button>
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border text-center">
            {joursSemaine.map((jour) => <div key={jour} className="border-b bg-muted/60 px-1 py-2 text-xs font-medium capitalize text-muted-foreground">{jour.slice(0, 2)}</div>)}
            {cellules.map((cellule) => {
              const duJour = (evenements ?? []).filter((evenement) => chevaucheJour(evenement, cellule.cle));
              return <div key={cellule.cle} className={`min-h-16 border-b border-e border-border p-1 text-start last:border-e-0 sm:min-h-24 sm:p-2 ${cellule.dansMois ? "bg-background" : "bg-muted/20 text-muted-foreground"}`}>
                <span className="text-xs tabular-nums">{cellule.date.getUTCDate()}</span>
                <div className="mt-1 max-h-16 space-y-1 overflow-y-auto sm:max-h-20">
                  {duJour.map((evenement) => (
                    <button
                      key={evenement.id}
                      type="button"
                      onClick={() => setEvenementSelectionne(evenement)}
                      title={evenement.titre || t("visuel.calendrier.evenementSansTitre")}
                      aria-label={`${evenement.titre || t("visuel.calendrier.evenementSansTitre")} · ${dateAffichee(evenement)}`}
                      className={`block w-full truncate rounded px-1 py-0.5 text-start text-[10px] leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:text-xs ${evenement.tentative ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900" : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-100 dark:hover:bg-emerald-900"}`}
                    >
                      {evenement.tentative && <span aria-label={t("visuel.calendrier.previsionnel")}>~ </span>}{evenement.titre || t("visuel.calendrier.evenementSansTitre")}
                    </button>
                  ))}
                </div>
              </div>;
            })}
          </div>

          <Dialog open={Boolean(evenementSelectionne)} onOpenChange={(ouvert) => { if (!ouvert) setEvenementSelectionne(null); }}>
            <DialogContent className="sm:max-w-lg">
              {evenementSelectionne && (
                <>
                  <DialogHeader>
                    <DialogTitle>{evenementSelectionne.titre || t("visuel.calendrier.evenementSansTitre")}</DialogTitle>
                    <DialogDescription>
                      {dateAffichee(evenementSelectionne)}
                      {evenementSelectionne.journeeEntiere && ` · ${t("visuel.calendrier.touteLaJournee")}`}
                      {` · ${t("visuel.calendrier.duree", { duree: dureeTexte(evenementSelectionne) })}`}
                    </DialogDescription>
                  </DialogHeader>
                  {evenementSelectionne.tentative && <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">{t("visuel.calendrier.previsionnel")}</span>}
                  {evenementSelectionne.description && <p className="whitespace-pre-line text-sm">{evenementSelectionne.description}</p>}
                  {(evenementSelectionne.url || source || sourceUrl) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {evenementSelectionne.url && <a href={evenementSelectionne.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400">{t("visuel.calendrier.lienEvenement")}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
                      {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400">{t("visuel.calendrier.source", { source: source ?? t("fiche.pageSource") })}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a> : source && <span className="text-muted-foreground">{t("visuel.source", { source })}</span>}
                    </div>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
