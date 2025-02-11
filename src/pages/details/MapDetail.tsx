import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Database } from "lucide-react";
import { Provider } from "@/interface/DatasetInterface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faDatabase,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { BoxReveal } from "@/components/ui/BoxReveal";
import { CustomMetaTags } from "@/components/MetaTags";
import axios from "axios"; // Ajout de l'importation d'axios
import { Octokit } from "@octokit/core"; // Ajout de l'importation d'Octokit
import { Spinner } from "flowbite-react";

interface MapData {
  title: string;
  description: string;
  data_source: string[];
  provider: Provider;
}

const MapDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapHtmlUrl, setMapHtmlUrl] = useState<string | null>(null);

  const octokit = new Octokit({
    auth: import.meta.env.VITE_GITHUB_COLLABORATORS_TOKEN,
  });
  useEffect(() => {
    const abortController = new AbortController();
    async function fetchMapData() {
      try {
        const response: any = await fetch(
          `${import.meta.env.VITE_API_URL}/maps/${id}/description`,
          { signal: abortController.signal }
        );
        if (!response.ok) {
          throw new Error("Error fetching map data.");
        }
        const data = await response.json();
        console.log(data);
        if (data) {
          setMapData(data);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchMapHtml() {
      try {
        const response: any = await fetch(
          `${import.meta.env.VITE_API_URL}/maps/${id}/map`,
          { signal: abortController.signal }
        );
        if (!response.ok) {
          throw new Error("Error fetching map HTML.");
        }
        const htmlString = await response.text();
        const blob = new Blob([htmlString], { type: "text/html" });
        setMapHtmlUrl(URL.createObjectURL(blob));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error("Error fetching map HTML:", error);
      }
    }

    fetchMapData();
    fetchMapHtml();

    return () => {
      abortController.abort();
    };
  }, [id]);

  if (!mapData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Spinner
          aria-label={t("detail.loading")}
          className="w-16 h-16"
          color="success"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <CustomMetaTags
        title={mapData ? mapData.title + " - Map-dz" : "Map not found - Map-dz"}
        description={mapData ? mapData.description : "Map not found"}
        path={`/map/${id}`}
      />

      <main className="flex-grow container mx-auto px-4 py-8 mt-20">
        <Button variant="outline" asChild>
          <a href="/geo">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            {t("detail.back")}
          </a>
        </Button>

        <div className="space-y-8 mt-2">
          <BoxReveal boxColor={"#5046e6"} duration={0.5}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-4">{mapData.title}</h1>
                <div className="mt-4 text-gray-600 dark:text-gray-400">
                  {mapData.description}
                </div>
              </div>
            </div>
          </BoxReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <main className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {loading ? (
                <div className="flex justify-center items-center h-[600px]">
                  <Spinner
                    aria-label={t("detail.loading")}
                    className="w-16 h-16"
                    color="success"
                  />
                </div>
              ) : (
                <iframe
                  src={mapHtmlUrl}
                  className="w-full h-[600px] rounded-lg"
                  title={mapData.title}
                />
              )}
            </main>

            <aside className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">
                {t("detail.information")}
              </h2>
              <div className="flex items-center mb-4">
                <img
                  src={mapData.provider.pictureUrl}
                  alt={mapData.provider.name}
                  className="w-6 h-6 mr-1 rounded-full border border-gray-300 dark:border-gray-600"
                />
                <span className="text-lg ml-2">{mapData.provider.name}</span>
              </div>
              <div className="flex items-center justify-evenly mb-4">
                <Button variant="outline" asChild>
                  <a href={`mailto:${mapData.provider.contact}`}>
                    Contact Provider
                  </a>
                </Button>
                {mapData.provider.website && (
                  <Button variant="outline" asChild>
                    <a href={mapData.provider.website}>
                      <FontAwesomeIcon icon={faGlobe} className="mr-2" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Data Sources:</h3>
                <div className="flex flex-wrap gap-2">
                  {mapData.data_source.map((source, index) => {
                    const fileName = source
                      .toLowerCase()
                      .replace(/\.[^/.]+$/, "");
                    return (
                      <a href={`/dataset/${fileName}`} key={index}>
                        <Button className="text-sm bg-green-400 dark:bg-green-600">
                          <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                          {source}
                        </Button>
                      </a>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MapDetail;
