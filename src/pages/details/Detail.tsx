import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Database } from "lucide-react";
import { Dataset } from "@/interface/DatasetInterface";
import { fetchData } from "@/lib/axios";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";

import { FaCircle, FaNetworkWired } from "react-icons/fa";
import {
  faArrowLeft,
  faCode,
  faDownload,
  faEye,
  faGlobe,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DataSearch } from "@/components/dataset/DataSearch";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { ApiSearch } from "@/components/api/ApiSearch";
import CustomMarkdown from "@/components/CustomMarkdown";

const Detail = () => {
  const { id } = useParams();

  const [fetching, setFetching] = useState(true);
  const [dataset, setDataset] = useState<Dataset>(null as any);
  const [displayFormat, setDisplayFormat] = useState("json");
  const [availableFormats, setAvailableFormats] = useState<string[]>([
    "table",
    "json",
    "csv",
  ]);
  const [weAreInDataPortal, setWeAreInDataPortal] = useState(false);
  const [isDynamicRessource, setIsDynamicRessource] = useState(false);

  function isMultiDimensional(data: Dataset) {
    // Analyse des dimensions des données
    let isMultiDimensional = false;

    if (data.preview) {
      if (Array.isArray(data.preview)) {
        // Cas où preview est une liste
        for (const item of data.preview) {
          for (const value of Object.values(item)) {
            if (
              (value !== null && typeof value === "object") ||
              Array.isArray(value)
            ) {
              console.log("Multi-dimensional dataset detected in array!");
              isMultiDimensional = true;
              break;
            }
          }
          if (isMultiDimensional) break;
        }
      } else if (typeof data.preview === "object" && data.preview !== null) {
        // Cas où preview est un objet direct
        for (const value of Object.values(data.preview)) {
          if (
            (value !== null && typeof value === "object") ||
            Array.isArray(value)
          ) {
            console.log("Multi-dimensional dataset detected in object!");
            isMultiDimensional = true;
            break;
          }
        }
      }
    }
    return isMultiDimensional;
  }

  const paymentProcess = async () => {
    // Payment process
  };

  const fetchApis = async () => {
    if (!window.location.pathname.includes("api")) {
      setWeAreInDataPortal(true);
    }

    const data: Dataset = await fetchData(
      `${import.meta.env.VITE_API_URL}/details/${id}`
    );

    // Analyse des dimensions des données
    const multiDimensional = isMultiDimensional(data);

    if (multiDimensional) {
      setAvailableFormats(["json"]); // Limiter aux formats supportés
      setDisplayFormat("json"); // Précoche JSON
    }

    if (data.type !== "file") {
      setIsDynamicRessource(true);
    }

    setDataset(data);
    setFetching(false);
  };

  useEffect(() => {
    fetchApis();
  }, [id]);

  const renderContent = () => {
    switch (displayFormat) {
      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  {dataset.preview.length > 0 &&
                    Object.keys(dataset.preview[0]).map((column) => (
                      <th key={column} className="text-left p-2 capitalize">
                        {column.replace(/_/g, " ")}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {dataset.preview.map(
                  (item: Record<string, unknown>, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-gray-300 dark:border-gray-700"
                    >
                      {Object.values(item).map((value, colIndex) => (
                        <td key={colIndex} className="p-2">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      case "json":
        return (
          <div
            style={{
              maxHeight: "400px",
              overflow: "auto",
              scrollbarColor: "#6F15E6FF #f3f4f6",
              scrollbarWidth: "thin",
              scrollBehavior: "smooth",

              borderRadius: "5px",
            }}
          >
            <pre>{JSON.stringify(dataset.preview, null, 2)}</pre>
          </div>
        );
      case "csv":
        const csvData = [
          Object.keys(dataset.preview[0]).join(","),
          ...dataset.preview.map((row) =>
            Object.values(row)
              .map((value) => `"${value}"`)
              .join(",")
          ),
        ].join("\n");
        return <pre>{csvData}</pre>;
      default:
        return <div>Format non supporté</div>;
    }
  };

  if (fetching) {
    return (
      <div className="text-gray-800 dark:text-gray-100">Chargement...</div>
    );
  }

  if (!dataset) {
    return (
      <div className="text-gray-800 dark:text-gray-100">Dataset not found</div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}
    >
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 mt-20">
        {/* Button retour */}
        <Button variant="outline" asChild>
          <a href="/">
            <FontAwesomeIcon icon={faArrowLeft} />
            Retour
          </a>
        </Button>
        <div className="space-y-8 mt-2">
          {/* En-tête */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold mb-4">{dataset.title.en} </h1>

              {/* Mots clés */}
              <div className="gap-4">
                <div className="flex flex-wrap gap-2">
                  {dataset.keywords.en.map((keyword: string) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 text-gray-600 dark:text-gray-400">
                <div>{dataset.description.en}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {weAreInDataPortal ? (
                <>
                  <Button
                    className="bg-green-500 text-white hover:bg-green-600"
                    onClick={paymentProcess}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Télécharger
                  </Button>

                  <a href={"/api/" + dataset.slug}>
                    <Button className="bg-purple-500 text-white hover:bg-purple-600">
                      <FontAwesomeIcon icon={faCode} />
                      Voir l'API associée
                    </Button>
                  </a>
                </>
              ) : (
                <>
                  <a href={"www.google.com"} target="_blank">
                    <Button
                      className="bg-green-500 text-white hover:bg-green-600"
                      onClick={paymentProcess}
                    >
                      <FontAwesomeIcon icon={faCode} />
                      Utiliser via{" "}
                      <img
                        src={
                          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/RapidAPI_logo.svg/2560px-RapidAPI_logo.svg.png"
                        }
                        className="w-22 h-6"
                        alt="RapidAPI"
                      />
                    </Button>
                  </a>
                  {/*   <Button
                    className="bg-blue-500 text-white hover:bg-blue-600"
                    onClick={paymentProcess}
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Voir le dataset
                  </Button> */}
                </>
              )}
            </div>
          </div>

          {/* Meta DATAS*/}
          <div className="flex gap-4 items-center">
            {isDynamicRessource ? (
              <span className="flex items-center animate-pulse text-green-500">
                <FaCircle className="w-3 h-3 mr-1 " />
                ready
              </span>
            ) : (
              <>
                <span className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  {dataset.length} enregistrements
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Mis à jour le {dataset.updatedDate}
                </span>
              </>
            )}

            {weAreInDataPortal ? (
              <span className="flex items-center">
                {dataset.type === "file" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Formats :
                    </span>
                    <Badge className="bg-blue-500 text-white">CSV</Badge>
                    <Badge className="bg-yellow-300 text-white">JSON</Badge>
                    <Badge className="bg-red-500 text-white">XML</Badge>
                    <Badge className="bg-green-500 text-white">XLS</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Ea</span>
                    <Badge className="bg-blue-500 text-white">JSON</Badge>
                  </div>
                )}
              </span>
            ) : (
              <span className="flex items-center">
                <FontAwesomeIcon icon={faGlobe} className="mr-2" />
                {dataset.source}
              </span>
            )}
            {!weAreInDataPortal && (
              <span className="flex items-center animate-pulse text-green-500">
                <FaCircle className="w-3 h-3 mr-1 " />
                ready
              </span>
            )}
          </div>

          {/* Sélecteur de format d'affichage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Colonne gauche : Menu d'onglets */}
            <main className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {weAreInDataPortal && (
                <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <h2 className="text-2xl font-semibold mr-4">
                        Extrait des données
                      </h2>
                      <div className="flex space-x-4">
                        {availableFormats.includes("table") && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="format"
                              value="table"
                              checked={displayFormat === "table"}
                              onChange={() => setDisplayFormat("table")}
                              className="mr-2"
                            />
                            Tableau
                          </label>
                        )}
                        {availableFormats.includes("json") && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="format"
                              value="json"
                              checked={displayFormat === "json"}
                              onChange={() => setDisplayFormat("json")}
                              className="mr-2"
                            />
                            JSON
                          </label>
                        )}
                        {availableFormats.includes("csv") && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="format"
                              value="csv"
                              checked={displayFormat === "csv"}
                              onChange={() => setDisplayFormat("csv")}
                              className="mr-2"
                            />
                            CSV
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="prose dark:prose-invert">
                    {renderContent()}
                  </div>
                </div>
              )}
              {!weAreInDataPortal && (
                <Tabs defaultValue="Documentation">
                  {/* Liste des onglets */}
                  <TabsList className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
                    {/*  <TabsTrigger
                      value="description"
                      className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Description
                    </TabsTrigger> */}
                    <TabsTrigger
                      value="Documentation"
                      className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      🗒️ Documentation
                    </TabsTrigger>
                    <TabsTrigger
                      value="data"
                      className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      🚀 Retour API
                    </TabsTrigger>
                  </TabsList>

                  {/* Contenu des onglets */}
                  <TabsContent value="Documentation">
                    <div className="prose dark:prose-invert">
                      <CustomMarkdown content={dataset.descriptionREADME} />
                    </div>
                  </TabsContent>
                  {/*   <TabsContent value="documentation">
                    <div className="prose dark:prose-invert">
                      <CustomMarkdown content={dataset.descriptionREADME} />
                    </div>
                  </TabsContent> */}
                  <TabsContent value="data">
                    <div className="flex space-x-4">
                      {availableFormats.includes("table") && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="format"
                            value="table"
                            checked={displayFormat === "table"}
                            onChange={() => setDisplayFormat("table")}
                            className="mr-2"
                          />
                          Tableau
                        </label>
                      )}
                      {availableFormats.includes("json") && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="format"
                            value="json"
                            checked={displayFormat === "json"}
                            onChange={() => setDisplayFormat("json")}
                            className="mr-2"
                          />
                          JSON
                        </label>
                      )}
                      {availableFormats.includes("csv") && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="format"
                            value="csv"
                            checked={displayFormat === "csv"}
                            onChange={() => setDisplayFormat("csv")}
                            className="mr-2"
                          />
                          CSV
                        </label>
                      )}
                    </div>
                    <div className="prose dark:prose-invert">
                      {renderContent()}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </main>
            {/* Colonne droite : Informations */}
            <aside className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Informations</h2>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <img
                    src={dataset.provider.pictureUrl}
                    alt={dataset.provider.name}
                    className="w-6 h-6 mr-1 rounded-full border border-gray-300 dark:border-gray-600"
                  />
                  <span>{dataset.provider.name}</span>
                </div>
                {dataset.provider.website && (
                  <Button variant="outline" asChild>
                    <a href={dataset.provider.website}>
                      <FontAwesomeIcon icon={faSearch} />
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href={`mailto:${dataset.provider.contact}`}>
                    Contacter le fournisseur
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                {dataset.source && (
                  <p className="text-sm">
                    <strong>Source :</strong> {dataset.source}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Ou rechercher d'autres */}

      <hr className="my-8 dark:border-gray-700 border-gray-300 w-1/3 mx-auto" />
      <div className=" py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-4">
            En rechercher d'autres...
          </h2>
        </div>
        <div className="">
          {weAreInDataPortal ? (
            <DataSearch />
          ) : (
            <div className="max-w-5xl mx-auto px-4 py-4">
              <ApiSearch />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Detail;
