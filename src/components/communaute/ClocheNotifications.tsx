import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, ClipboardCheck, Inbox, Loader2, RefreshCw, Reply, Rocket, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { dateComplete, ilYa } from "@/lib/dates";
import { cleErreur } from "@/lib/erreurs";
import {
  chargerNotifications,
  lienInterne,
  marquerLue,
  texteNotification,
  toutMarquerLu,
  type BoiteNotifications,
  type Notification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const icones: Record<string, LucideIcon> = {
  nouvelle_soumission: Inbox,
  revue: ClipboardCheck,
  publiee: Rocket,
  reponse: Reply,
  nouvelle_version: RefreshCw,
};

const INTERVALLE_RAFRAICHISSEMENT = 60 * 1000;

/** Cloche de l'en-tête : nombre de non lues, liste déroulante, rafraîchie à l'ouverture et toutes les 60 secondes. */
export const ClocheNotifications = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const naviguer = useNavigate();
  const { utilisateur } = useAuth();
  const clientRequetes = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const cle = ["notifications", utilisateur?.id];

  const requete = useQuery({
    queryKey: cle,
    queryFn: chargerNotifications,
    enabled: Boolean(utilisateur),
    refetchInterval: INTERVALLE_RAFRAICHISSEMENT,
    staleTime: 0,
  });
  const nonLues = requete.data?.nonLues ?? 0;

  const marquerDansLeCache = (id: string | null) =>
    clientRequetes.setQueryData<BoiteNotifications>(cle, (boite) =>
      boite && {
        liste: boite.liste.map((n) => (id === null || n.id === id ? { ...n, lue: true } : n)),
        nonLues: id === null ? 0 : Math.max(0, boite.nonLues - 1),
      }
    );

  const ouvrir = async (notification: Notification) => {
    setErreur(null);
    setOuvert(false);
    if (!notification.lue) {
      marquerDansLeCache(notification.id);
      marquerLue(notification.id).catch(() => clientRequetes.invalidateQueries({ queryKey: cle }));
    }
    const lien = lienInterne(notification.lien);
    if (lien) naviguer(lien);
  };

  const toutLire = async () => {
    setErreur(null);
    marquerDansLeCache(null);
    try {
      await toutMarquerLu();
    } catch (e) {
      setErreur(cleErreur(e));
      clientRequetes.invalidateQueries({ queryKey: cle });
    }
  };

  if (!utilisateur) return null;
  const libelle = nonLues > 0 ? t("notifications.libelleNonLues", { count: nonLues }) : t("notifications.titre");

  return (
    <Popover
      open={ouvert}
      onOpenChange={(etat) => {
        setOuvert(etat);
        if (etat) void requete.refetch();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={libelle} title={libelle}>
          <Bell className="h-5 w-5" />
          {nonLues > 0 && (
            <span className="absolute -end-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[1.15rem] text-white tabular-nums" aria-hidden>
              {nonLues > 9 ? "9+" : nonLues}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-semibold">{t("notifications.titre")}</p>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={toutLire} disabled={nonLues === 0}>
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.toutLu")}
          </Button>
        </div>
        {erreur && <p className="px-4 py-2 text-xs text-red-600">{t(erreur)}</p>}
        {requete.isPending ? (
          <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("notifications.chargement")}
          </p>
        ) : requete.isError ? (
          <p className="p-6 text-center text-sm text-red-600">{t(cleErreur(requete.error))}</p>
        ) : requete.data.liste.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 opacity-40" aria-hidden />
            {t("notifications.aucune")}
          </div>
        ) : (
          <ul className="max-h-[26rem] divide-y overflow-y-auto">
            {requete.data.liste.map((notification) => {
              const { cle: cleTexte, valeurs } = texteNotification(notification, langue);
              const Icone = icones[notification.type] ?? Bell;
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => ouvrir(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5",
                      !notification.lue && "bg-emerald-50/60 dark:bg-emerald-500/5"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                      <Icone className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block", !notification.lue && "font-semibold")}>{t(cleTexte, valeurs)}</span>
                      <time dateTime={notification.cree_le} title={dateComplete(notification.cree_le, langue)} className="mt-0.5 block text-xs text-muted-foreground">
                        {ilYa(notification.cree_le, langue)}
                      </time>
                    </span>
                    {!notification.lue && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-label={t("notifications.nonLue")} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
