import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Eye } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Link } from "react-router-dom";
import { Dataset } from "@/interface/DatasetInterface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export function DatasetCard(dataset: Dataset) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("fr");

  return (
    <Link to={`/dataset/${dataset.slug}`} className="w-full">
      <Card className="relative group hover:shadow-lg transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 h-full">
        <BorderBeam
          size={300}
          duration={20}
          colorFrom="#1a365d"
          colorTo="#10b981"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {dataset.provider.pictureUrl ? (
                <img
                  src={dataset.provider.pictureUrl}
                  alt={dataset.provider.name}
                  className="w-6 h-6 mr-1 rounded-full border border-gray-300 dark:border-gray-600"
                />
              ) : (
                <FontAwesomeIcon icon={faUser} className="w-6 h-6 mr-1" />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {dataset.provider.name}
              </span>
            </div>
            <Badge variant="secondary">{dataset.category[language]}</Badge>
          </div>
          <CardTitle className="text-lg font-semibold">
            {dataset.title[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4 dark:text-gray-400">
            {dataset.description[language]}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {dataset.keywords[language].map((keyword: string) => (
              <Badge
                key={keyword}
                variant="outline"
                className="text-xs dark:border-gray-600"
              >
                {keyword}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 mb-4 dark:text-gray-400">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {dataset.updatedDate}
            </div>
            {/*   <div className="flex items-center gap-4">
              <span className="flex items-center">
                <Download className="w-4 h-4 mr-1" />
                {dataset.downloads}
              </span>
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {dataset.views}
              </span>
            </div> */}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-primary font-semibold dark:text-secondary">
              1✨/requête
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
