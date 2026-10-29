import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErreurApi } from "@/lib/api";
import { CLE_SOURCES_ADMIN, useSourcesAdmin } from "@/hooks/use-sources-admin";
import { creerSource, type SourceApi } from "@/lib/admin-donnees";

const NOUVELLE = "__nouvelle__";

interface ChoixSourceProps {
  id?: string;
  valeur: string;
  onChange: (slug: string) => void;
  /** Nom et site proposés pour une nouvelle source (ceux tapés par l'auteur d'une proposition). */
  suggestion?: { nom: string | null; url: string | null };
}

/** Menu des sources + « Nouvelle source » (nom, site), créée par l'API puis sélectionnée. */
export const ChoixSource = ({ id, valeur, onChange, suggestion }: ChoixSourceProps) => {
  const { t } = useTranslation();
  const clientRequetes = useQueryClient();
  const { data: sources = [] } = useSourcesAdmin();
  const [creation, setCreation] = useState(false);
  const [nom, setNom] = useState("");
  const [url, setUrl] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const ouvrirCreation = () => {
    setNom(suggestion?.nom ?? "");
    setUrl(suggestion?.url ?? "");
    setCreation(true);
  };

  const selectionner = (slug: string) => (slug === NOUVELLE ? ouvrirCreation() : onChange(slug));

  const creer = async () => {
    const nomPropre = nom.trim();
    if (nomPropre.length < 2) return;
    setEnvoi(true);
    try {
      const source = await creerSource(nomPropre, url.trim() || null);
      clientRequetes.setQueryData<SourceApi[]>(CLE_SOURCES_ADMIN, (actuelles = []) =>
        [...actuelles, source].sort((a, b) => a.nom.localeCompare(b.nom))
      );
      clientRequetes.invalidateQueries({ queryKey: ["sources"] });
      onChange(source.slug);
      setCreation(false);
      toast.success(t("adminDonnees.sources.creee", { nom: source.nom }));
    } catch (erreur) {
      const slugExistant = (erreur instanceof ErreurApi && erreur.code === "source_exists" && (erreur.details as { slug?: string } | undefined)?.slug) || null;
      if (slugExistant) {
        await clientRequetes.invalidateQueries({ queryKey: CLE_SOURCES_ADMIN });
        onChange(slugExistant);
        setCreation(false);
        toast.info(t("adminDonnees.sources.existeDeja"));
      } else {
        toast.error(erreur instanceof Error ? erreur.message : t("adminDonnees.erreur"));
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Select value={valeur} onValueChange={selectionner}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sources.map((source) => (
            <SelectItem key={source.slug} value={source.slug}>
              {source.nom}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NOUVELLE}>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <Plus className="h-4 w-4" aria-hidden />
              {t("adminDonnees.sources.nouvelle")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {creation && (
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="nouvelle-source-nom">{t("adminDonnees.sources.nom")}</Label>
            <Input id="nouvelle-source-nom" value={nom} maxLength={200} dir="auto" onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nouvelle-source-url">{t("adminDonnees.sources.site")}</Label>
            <Input id="nouvelle-source-url" type="url" dir="ltr" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="gap-1.5" disabled={envoi || nom.trim().length < 2} onClick={() => void creer()}>
              {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("adminDonnees.sources.creer")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={envoi} onClick={() => setCreation(false)}>
              {t("adminDonnees.annuler")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
