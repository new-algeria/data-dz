import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import { apis } from "@/data/FakeApi";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const ApiSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex justify-between items-center mb-6 mt-12 z-10">
        <h2 className="text-xl font-semibold">{t('api.search.title')}</h2>
        <Input
          placeholder={t('api.search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs dark:bg-gray-800 z-10"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 z-10">
        {apis
          .filter((api) =>
            api.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((api) => (
            <Link to={`/api/${api.slug}`} key={api.title}>
              <div className="p-6 rounded-lg border border-gray-800 dark:bg-gray-900/50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{api.title}</h3>
                  {api.requiresCredits ? (
                    <Lock className="text-yellow-500" />
                  ) : (
                    <Unlock className="text-green-500" />
                  )}
                </div>
                <p className="text-gray-700 mb-4 dark:text-gray-400">
                  {api.description}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 dark:text-gray-500">
                    {t('api.card.availability')}: {api.availability}%
                  </span>
                  <span className="text-gray-400">{t('api.card.version')}: {api.version}</span>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
};