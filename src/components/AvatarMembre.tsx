import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initiales, type Profil } from "@/lib/profils";
import { cn } from "@/lib/utils";

interface AvatarMembreProps {
  profil: Pick<Profil, "pseudo" | "nom_affiche" | "avatar_url">;
  className?: string;
}

/** Photo du membre, ou ses initiales sur un fond vert quand il n'en a pas (ou si l'image ne charge pas). */
export const AvatarMembre = ({ profil, className }: AvatarMembreProps) => (
  <Avatar className={cn("h-9 w-9", className)}>
    {profil.avatar_url && <AvatarImage src={profil.avatar_url} alt="" className="object-cover" />}
    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-white">
      {initiales(profil)}
    </AvatarFallback>
  </Avatar>
);
