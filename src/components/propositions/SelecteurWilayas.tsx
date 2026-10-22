import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { chargerWilayas, type Wilaya } from "@/lib/referentiels";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { cn } from "@/lib/utils";

interface SelecteurWilayasProps {
  id: string;
  valeur: string[];
  onChange: (codes: string[]) => void;
}

/** Choix de plusieurs wilayas (codes « 01 » à « 69 ») ; aucune sélection = toute l'Algérie. */
export const SelecteurWilayas = ({ id, valeur, onChange }: SelecteurWilayasProps) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [ouvert, setOuvert] = useState(false);
  const { data: wilayas = [] } = useQuery({ queryKey: ["wilayas"], queryFn: chargerWilayas, staleTime: Infinity });

  const libelle = (wilaya: Wilaya) => {
    const nom = texteTraduit(wilaya.nom, langue);
    return nom ? `${wilaya.code} · ${nom}` : wilaya.code;
  };
  const parCode = new Map(wilayas.map((wilaya) => [wilaya.code, wilaya]));
  const basculer = (code: string) =>
    onChange(valeur.includes(code) ? valeur.filter((c) => c !== code) : [...valeur, code].sort());

  return (
    <div className="space-y-2">
      <Popover open={ouvert} onOpenChange={setOuvert}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={ouvert} className="w-full justify-between font-normal">
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {valeur.length === 0
                ? t("propositions.champs.toutesWilayas")
                : t("propositions.champs.wilayasChoisies", { count: valeur.length })}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command
            filter={(code, recherche) => {
              const wilaya = parCode.get(code);
              const texte = `${code} ${wilaya ? Object.values(wilaya.nom).join(" ") : ""}`.toLowerCase();
              return texte.includes(recherche.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder={t("propositions.champs.rechercherWilaya")} />
            <CommandList className="max-h-64">
              <CommandEmpty>{t("propositions.champs.aucuneWilaya")}</CommandEmpty>
              <CommandGroup>
                {wilayas.map((wilaya) => (
                  <CommandItem key={wilaya.code} value={wilaya.code} onSelect={() => basculer(wilaya.code)} className="gap-2">
                    <Check className={cn("h-4 w-4", valeur.includes(wilaya.code) ? "opacity-100" : "opacity-0")} aria-hidden />
                    <span dir="auto">{libelle(wilaya)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {valeur.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {valeur.map((code) => (
            <li key={code} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs dark:bg-white/10">
              <span dir="auto">{parCode.get(code) ? libelle(parCode.get(code)!) : code}</span>
              <button type="button" onClick={() => basculer(code)} aria-label={t("propositions.champs.retirerWilaya", { code })}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
