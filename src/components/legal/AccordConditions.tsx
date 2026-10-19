import { Link } from "react-router-dom";
import { Trans } from "react-i18next";

const classeLien = "font-medium text-emerald-700 underline underline-offset-2 hover:no-underline dark:text-emerald-400";

/** « En créant un compte, vous acceptez nos conditions d'utilisation et nos règles de confidentialité. » */
export const AccordConditions = () => (
  <p className="text-center text-xs leading-relaxed text-muted-foreground">
    <Trans
      i18nKey="legal.acceptation"
      components={{
        conditions: <Link to="/conditions" className={classeLien} />,
        confidentialite: <Link to="/confidentialite" className={classeLien} />,
      }}
    />
  </p>
);
