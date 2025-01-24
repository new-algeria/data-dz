import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Database, User, Sun, Moon } from "lucide-react";
import { Dataset } from "@/interface/DatasetInterface";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchData } from "@/lib/axios";

const DatasetDetail = () => {
  const { id } = useParams();

  const [fetching, setFetching] = useState(true);
  const [dataset, setDataset] = useState<Dataset>(null as any);
  const [displayFormat, setDisplayFormat] = useState("table");

  const fetchApis = async () => {
    const data: Dataset[] = await fetchData(
      `${import.meta.env.VITE_API_URL}/info`
    );
    data.forEach((dataset) => {
      if (dataset.slug === id) {
        setDataset(dataset);
        setFetching(false);
      }
    });
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
                {dataset.preview.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-300 dark:border-gray-700"
                  >
                    {Object.values(item).map((value, colIndex) => (
                      <td key={colIndex} className="p-2">
                        {/*       {value} */}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "json":
        return (
          <pre className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 rounded">
            {JSON.stringify(dataset.preview, null, 2)}
          </pre>
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
        return (
          <pre className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 rounded">
            {csvData}
          </pre>
        );
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

      <main className="flex-grow container mx-auto px-4 py-8 mt-24">
        {/* Button retour */}
        <Button variant="outline" asChild>
          <a href="/api">
            {" "}
            <FontAwesomeIcon icon={faArrowLeft} />
            Retour
          </a>
        </Button>
        <div className="space-y-8">
          {/* En-tête */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-4">{dataset.title.en}</h1>
              <div className="flex gap-4 items-center">
                <Badge variant="secondary">
                  <FileText className="w-4 h-4 mr-2" />
                  {dataset.source}
                </Badge>
                <span className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  {dataset.dataSize} enregistrements
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Mis à jour le {dataset.updatedDate}
                </span>
              </div>
            </div>

            {dataset.sourceURL && (
              <Link to={dataset.sourceURL}>
                <Button>Voir l'API associée</Button>
              </Link>
            )}
          </div>

          {/* Description */}
          <div className="p-6 rounded-lg prose bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <div className="markdown-content">{dataset.description.en}</div>
          </div>

          {/* Sélecteur de format d'affichage */}
          <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h2 className="text-2xl font-semibold mr-4">
                  Extrait des données
                </h2>
                <div className="flex space-x-4">
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
                </div>
              </div>
            </div>
            {renderContent()}
          </div>

          {/* Informations sur le fournisseur */}
          <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <h2 className="text-2xl font-semibold mb-4">Fournisseur</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={dataset.provider.pictureUrl}
                  alt={dataset.provider.name}
                  className="w-8 h-8 mr-2 rounded-full"
                />
                <span>{dataset.provider.name}</span>
              </div>
              <Button variant="outline" asChild>
                <a href={`mailto:${dataset.provider.contact}`}>
                  Contacter le fournisseur
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DatasetDetail;
