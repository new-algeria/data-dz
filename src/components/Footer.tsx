import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('footer.about')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('footer.aboutText')}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/api" className="text-gray-600 dark:text-gray-300 hover:text-primary">
                  APIs
                </Link>
              </li>
              <li>
                <Link to="/getting-started" className="text-gray-600 dark:text-gray-300 hover:text-primary">
                  {t('navbar.getStarted')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('footer.contact')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('footer.contactText')}<br />
              {t('footer.followUs')}
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-gray-600 dark:text-gray-300">
            © {new Date().getFullYear()} Data DZ. {t('footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
};