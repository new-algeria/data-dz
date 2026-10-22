import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconeCategorie } from "@/components/BadgeCategorie";
import { ChampMotsCles } from "./ChampMotsCles";
import { SelecteurWilayas } from "./SelecteurWilayas";
import { chargerCategories } from "@/lib/catalogue";
import { chargerLicences } from "@/lib/referentiels";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import {
  LONGUEUR_MAX_DESCRIPTION,
  LONGUEUR_MAX_MESSAGE,
  LONGUEUR_MAX_SOURCE_NOM,
  LONGUEUR_MAX_TITRE,
  type ValeursFormulaire,
} from "@/lib/formulaire-soumission";

const AUCUNE = "aucune";

const Champ = ({ id, libelle, aide, facultatif, compteur, children }: {
  id: string;
  libelle: string;
  aide?: string;
  facultatif?: boolean;
  compteur?: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {libelle}
          {facultatif && <span className="ms-1.5 text-xs font-normal text-muted-foreground">({t("propositions.champs.facultatif")})</span>}
        </Label>
        {compteur}
      </div>
      {children}
      {aide && <p className="text-xs text-muted-foreground">{aide}</p>}
    </div>
  );
};

const Compteur = ({ valeur, max }: { valeur: string; max: number }) => (
  <span className={valeur.length > max ? "text-xs text-red-600" : "text-xs tabular-nums text-muted-foreground"}>
    {valeur.length} / {max}
  </span>
);

interface ChampsPropositionProps {
  valeurs: ValeursFormulaire;
  onChange: (modification: Partial<ValeursFormulaire>) => void;
}

/** Champs d'une proposition (sans les fichiers), partagés par la création et la modification. */
export const ChampsProposition = ({ valeurs: v, onChange }: ChampsPropositionProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [traductions, setTraductions] = useState(Boolean(v.titreEn || v.titreAr || v.descriptionEn || v.descriptionAr));
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: chargerCategories, staleTime: 60 * 60 * 1000 });
  const { data: licences = [] } = useQuery({ queryKey: ["licences"], queryFn: chargerLicences, staleTime: 60 * 60 * 1000 });

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("propositions.sections.description")}</legend>
        <Champ id="titre-fr" libelle={t("propositions.champs.titreFr")} compteur={<Compteur valeur={v.titreFr} max={LONGUEUR_MAX_TITRE} />}>
          <Input id="titre-fr" value={v.titreFr} onChange={(e) => onChange({ titreFr: e.target.value })} maxLength={LONGUEUR_MAX_TITRE} required lang="fr" />
        </Champ>
        <Champ id="description-fr" libelle={t("propositions.champs.descriptionFr")} facultatif compteur={<Compteur valeur={v.descriptionFr} max={LONGUEUR_MAX_DESCRIPTION} />}>
          <Textarea id="description-fr" value={v.descriptionFr} onChange={(e) => onChange({ descriptionFr: e.target.value })} rows={4} maxLength={LONGUEUR_MAX_DESCRIPTION} lang="fr" />
        </Champ>

        <button
          type="button"
          onClick={() => setTraductions((ouvert) => !ouvert)}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          aria-expanded={traductions}
        >
          <Languages className="h-4 w-4" aria-hidden />
          {t("propositions.champs.traductions")}
          <ChevronDown className={traductions ? "h-4 w-4 rotate-180 transition-transform" : "h-4 w-4 transition-transform"} aria-hidden />
        </button>
        {traductions && (
          <div className="grid gap-4 rounded-xl border border-dashed p-4 md:grid-cols-2">
            <Champ id="titre-en" libelle={t("propositions.champs.titreEn")} facultatif>
              <Input id="titre-en" value={v.titreEn} onChange={(e) => onChange({ titreEn: e.target.value })} maxLength={LONGUEUR_MAX_TITRE} lang="en" dir="ltr" />
            </Champ>
            <Champ id="titre-ar" libelle={t("propositions.champs.titreAr")} facultatif>
              <Input id="titre-ar" value={v.titreAr} onChange={(e) => onChange({ titreAr: e.target.value })} maxLength={LONGUEUR_MAX_TITRE} lang="ar" dir="rtl" />
            </Champ>
            <Champ id="description-en" libelle={t("propositions.champs.descriptionEn")} facultatif>
              <Textarea id="description-en" value={v.descriptionEn} onChange={(e) => onChange({ descriptionEn: e.target.value })} rows={3} maxLength={LONGUEUR_MAX_DESCRIPTION} lang="en" dir="ltr" />
            </Champ>
            <Champ id="description-ar" libelle={t("propositions.champs.descriptionAr")} facultatif>
              <Textarea id="description-ar" value={v.descriptionAr} onChange={(e) => onChange({ descriptionAr: e.target.value })} rows={3} maxLength={LONGUEUR_MAX_DESCRIPTION} lang="ar" dir="rtl" />
            </Champ>
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2">{t("propositions.sections.classement")}</legend>
        <Champ id="categorie" libelle={t("propositions.champs.categorie")} facultatif>
          <Select value={v.categorie || AUCUNE} onValueChange={(valeur) => onChange({ categorie: valeur === AUCUNE ? "" : valeur })}>
            <SelectTrigger id="categorie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUCUNE}>{t("propositions.champs.aucuneCategorie")}</SelectItem>
              {categories.map((categorie) => (
                <SelectItem key={categorie.slug} value={categorie.slug}>
                  <span className="flex items-center gap-2">
                    <IconeCategorie icone={categorie.icone} />
                    {texteTraduit(categorie.nom, langue)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>
        <Champ id="licence" libelle={t("propositions.champs.licence")} facultatif aide={t("propositions.champs.licenceAide")}>
          <Select value={v.licence || AUCUNE} onValueChange={(valeur) => onChange({ licence: valeur === AUCUNE ? "" : valeur })}>
            <SelectTrigger id="licence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUCUNE}>{t("propositions.champs.licenceInconnue")}</SelectItem>
              {licences.map((licence) => (
                <SelectItem key={licence.code} value={licence.code}>
                  <span dir="ltr" className="font-mono text-xs">{licence.code}</span>
                  <span className="ms-2 text-muted-foreground">{licence.nom}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>
        <div className="md:col-span-2">
          <Champ id="mots-cles" libelle={t("propositions.champs.motsCles")} facultatif aide={t("propositions.champs.motsClesAide")}>
            <ChampMotsCles id="mots-cles" valeur={v.motsCles} onChange={(motsCles) => onChange({ motsCles })} />
          </Champ>
        </div>
        <div className="md:col-span-2">
          <Champ id="wilayas" libelle={t("propositions.champs.wilayas")} facultatif>
            <SelecteurWilayas id="wilayas" valeur={v.wilayas} onChange={(wilayas) => onChange({ wilayas })} />
          </Champ>
        </div>
        <Champ id="periode-debut" libelle={t("propositions.champs.periodeDebut")} facultatif>
          <Input id="periode-debut" type="date" value={v.periodeDebut} onChange={(e) => onChange({ periodeDebut: e.target.value })} />
        </Champ>
        <Champ id="periode-fin" libelle={t("propositions.champs.periodeFin")} facultatif>
          <Input id="periode-fin" type="date" value={v.periodeFin} min={v.periodeDebut || undefined} onChange={(e) => onChange({ periodeFin: e.target.value })} />
        </Champ>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2">{t("propositions.sections.source")}</legend>
        <Champ id="source-nom" libelle={t("propositions.champs.sourceNom")} facultatif aide={t("propositions.champs.sourceAide")}>
          <Input id="source-nom" value={v.sourceNom} onChange={(e) => onChange({ sourceNom: e.target.value })} maxLength={LONGUEUR_MAX_SOURCE_NOM} dir="auto" />
        </Champ>
        <Champ id="source-url" libelle={t("propositions.champs.sourceUrl")} facultatif>
          <Input id="source-url" value={v.sourceUrl} onChange={(e) => onChange({ sourceUrl: e.target.value })} inputMode="url" placeholder="https://" dir="ltr" />
        </Champ>
      </fieldset>

      <Champ id="message" libelle={t("propositions.champs.message")} facultatif aide={t("propositions.champs.messageAide")} compteur={<Compteur valeur={v.message} max={LONGUEUR_MAX_MESSAGE} />}>
        <Textarea id="message" value={v.message} onChange={(e) => onChange({ message: e.target.value })} rows={3} maxLength={LONGUEUR_MAX_MESSAGE} dir="auto" />
      </Champ>
    </div>
  );
};
