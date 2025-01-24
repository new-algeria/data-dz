import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dataset } from "@/interface/DatasetInterface";
import { fetchData } from "@/lib/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faFileCode } from "@fortawesome/free-solid-svg-icons";

export const ApiSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const [apis, setApis] = useState<Dataset[]>([]);
  const [filteredApis, setFilteredApis] = useState<Dataset[]>([]);

  const fetchApis = async () => {
    const data = await fetchData(`${import.meta.env.VITE_API_URL}/info`);

    setApis(data);
    setFilteredApis(data);
  };
  useEffect(() => {
    fetchApis();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6 mt-12 z-10">
        <h2 className="text-xl font-semibold">{t("api.search.title")}</h2>
        <Input
          placeholder={t("api.search.placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs dark:bg-gray-800 z-10"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 z-10">
        {filteredApis
          .filter(
            (api) =>
              api.title.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
              api.description.en
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          )
          .map((api) => (
            <Link to={`/api/${api.slug}`} key={api.slug}>
              <div className="p-6 rounded-lg border border-gray-800 dark:bg-gray-900/50">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{api.title.en}</h3>
                  {/*   {api.requiresCredits ? (
                    <Lock className="text-yellow-500" />
                  ) : (
                    <Unlock className="text-green-500" />
                  )} */}
                </div>
                <p className="text-gray-700 mb-4 dark:text-gray-400">
                  {api.description.en}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 dark:text-gray-500">
                    version:{api.updatedDate}
                  </span>
                  <span className="text-gray-400">
                    {/*  {api.dataSize} {t("api.card.dataSize")} */}
                    {api.descriptionREADME && (
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="w-4 h-4 mr-1 text-green-400"
                      />
                    )}
                    <FontAwesomeIcon
                      icon={faFileCode}
                      className="w-4 h-4 mr-1 text-blue-400"
                    />
                  </span>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
};
