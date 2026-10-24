import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil } from "lucide-react";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cleErreur } from "@/lib/erreurs";
import { champsModifies, validerValeurs, valeursDepuisSoumission, versChamps, type ValeursFormulaire } from "@/lib/formulaire-soumission";
import { mettreAJourSoumission, noterModification, type Soumission } from "@/lib/soumissions";
import { cn } from "@/lib/utils";
import { ChampsProposition } from "./ChampsProposition";
import { DetailsProposition } from "./DetailsProposition";

type Message = { type: "erreur" | "succes"; texte: string };

const LONGUEUR_MAX_NOTE = 1000;

interface ContenuPropositionProps {
  soumission: Soumission;
  modifiable: boolean;
  surEnregistrement: () => Promise<void>;
  /** Modérateur : la modification est tracée dans l'historique et l'auteur est prévenu. */
  moderation?: boolean;
}

/** Contenu de la proposition : lecture seule, ou formulaire tant qu'elle est modifiable. */
export const ContenuProposition = ({ soumission, modifiable, surEnregistrement, moderation = false }: ContenuPropositionProps) => {
  const { t } = useTranslation();
  const [valeurs, setValeurs] = useState<ValeursFormulaire | null>(null);
  const [note, setNote] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const enregistrer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    if (!valeurs) return;
    setMessage(null);
    const probleme = validerValeurs(valeurs);
    if (probleme) return setMessage({ type: "erreur", texte: t(probleme) });
    if (note.trim().length > LONGUEUR_MAX_NOTE) return setMessage({ type: "erreur", texte: t("erreurs.commentaireTropLong") });

    const modifies = champsModifies(valeursDepuisSoumission(soumission), valeurs);
    if (moderation && modifies.length === 0) return setMessage({ type: "erreur", texte: t("moderation.revue.aucuneModification") });

    setEnregistrement(true);
    try {
      await mettreAJourSoumission(soumission.id, versChamps(valeurs));
      if (moderation) {
        const champs = modifies.map((champ) => t(`propositions.champs.${champ}`)).join(", ");
        const details = [t("moderation.revue.journalChamps", { champs }), note.trim()].filter(Boolean).join("\n\n");
        await noterModification(soumission.id, details);
      }
      await surEnregistrement();
      setValeurs(null);
      setNote("");
      setMessage({ type: "succes", texte: t(moderation ? "moderation.revue.modificationEnregistree" : "propositions.detail.enregistre") });
    } catch (e) {
      setMessage({ type: "erreur", texte: t(cleErreur(e)) });
    } finally {
      setEnregistrement(false);
    }
  };

  if (valeurs && modifiable) {
    return (
      <form onSubmit={enregistrer} className="space-y-6" noValidate>
        {moderation && <MessageAuth type="info">{t("moderation.revue.aideModification")}</MessageAuth>}
        <ChampsProposition valeurs={valeurs} onChange={(modification) => setValeurs((v) => (v ? { ...v, ...modification } : v))} />
        {moderation && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="note-modification">
                {t("moderation.revue.noteModification")}
                <span className="ms-1.5 text-xs font-normal text-muted-foreground">({t("propositions.champs.facultatif")})</span>
              </Label>
              <span className={cn("text-xs tabular-nums", note.length > LONGUEUR_MAX_NOTE ? "text-red-600" : "text-muted-foreground")}>
                {note.length} / {LONGUEUR_MAX_NOTE}
              </span>
            </div>
            <Textarea id="note-modification" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={LONGUEUR_MAX_NOTE} dir="auto" />
          </div>
        )}
        {message && <MessageAuth type={message.type}>{message.texte}</MessageAuth>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={enregistrement}>
            {enregistrement && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("propositions.detail.enregistrer")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setValeurs(null)} disabled={enregistrement}>
            {t("propositions.detail.annuler")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {message && <MessageAuth type={message.type}>{message.texte}</MessageAuth>}
      <DetailsProposition soumission={soumission} />
      {modifiable && (
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => {
            setMessage(null);
            setValeurs(valeursDepuisSoumission(soumission));
          }}
        >
          <Pencil className="h-4 w-4" />
          {t(moderation ? "moderation.revue.modifier" : "propositions.detail.modifier")}
        </Button>
      )}
    </div>
  );
};
