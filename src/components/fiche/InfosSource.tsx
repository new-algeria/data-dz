import { valeurEnTexte } from "@/lib/valeurs";

/** Métadonnées brutes fournies par la source (couverture, nombre de wilayas…), affichées telles quelles. */
export const InfosSource = ({ infos }: { infos: Record<string, unknown> }) => {
  const entrees = Object.entries(infos).filter(([, valeur]) => valeur !== null && valeur !== "");

  if (entrees.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
      {entrees.map(([cle, valeur]) => (
        <div key={cle} className="contents">
          <dt className="font-mono text-xs text-muted-foreground pt-0.5" dir="ltr">
            {cle}
          </dt>
          <dd className="break-words min-w-0" dir="auto">
            {valeurEnTexte(valeur, 200)}
          </dd>
        </div>
      ))}
    </dl>
  );
};
