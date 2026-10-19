import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageAuthProps {
  type: "erreur" | "succes" | "email";
  children: ReactNode;
}

const styles = {
  erreur: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  succes: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  email: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
};

const icones = { erreur: AlertCircle, succes: CheckCircle2, email: MailCheck };

export const MessageAuth = ({ type, children }: MessageAuthProps) => {
  const Icone = icones[type];
  return (
    <div
      role={type === "erreur" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-sm", styles[type])}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
};
