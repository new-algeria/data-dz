import { AlertCircle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EtatErreurProps {
  message: string;
  onReessayer?: () => void;
}

export const EtatErreur = ({ message, onReessayer }: EtatErreurProps) => {
  const { t } = useTranslation();

  return (
    <Alert variant="destructive" className="max-w-xl mx-auto">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <span>{message}</span>
        {onReessayer && (
          <Button variant="outline" size="sm" onClick={onReessayer}>
            <RotateCw />
            {t("catalogue.reessayer")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
