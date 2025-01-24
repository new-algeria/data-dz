import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { faArrowLeft, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dataset } from "@/interface/DatasetInterface";
import { set } from "date-fns";

export default function ApiDetail() {
  const { id } = useParams();

  const [fetching, setFetching] = useState(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);

  useEffect(() => {
    // fetch dataset
    setFetching(true);

    setFetching(false);
  }, [id]);

  if (fetching)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        Chargement...
      </div>
    );
  if (!dataset)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        API non trouvée
      </div>
    );

  const language = "fr"; // ou 'en', 'ar' selon la langue choisie

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-24">
        {/* Button retour */}
        <Button variant="outline" asChild>
          <a href="/api">
            {" "}
            <FontAwesomeIcon icon={faArrowLeft} />
            Retour
          </a>
        </Button>
        {/* En-tête */}
        <header className="mb-8 mt-2">
          <h1 className="text-4xl font-bold mb-4">{dataset.title[language]}</h1>
          <div className="flex items-center gap-4">
            <Badge
              content={`${dataset.source} - ${dataset.updatedDate}`}
              type="success"
            />
            <Badge content={dataset.category[language]} type="warning" />
          </div>
        </header>

        {/* Mise en page principale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonne gauche : Menu d'onglets */}
          <main className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Tabs defaultValue="description">
              {/* Liste des onglets */}
              <TabsList className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
                <TabsTrigger
                  value="description"
                  className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="documentation"
                  className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Documentation
                </TabsTrigger>
                <TabsTrigger
                  value="test"
                  className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Tester l'API
                </TabsTrigger>
              </TabsList>

              {/* Contenu des onglets */}
              <TabsContent value="description">
                <div className="prose dark:prose-invert">
                  <ReactMarkdown>{dataset.descriptionREADME}</ReactMarkdown>
                </div>
              </TabsContent>
              <TabsContent value="documentation">
                <div className="prose dark:prose-invert">
                  <ReactMarkdown>{dataset.descriptionREADME}</ReactMarkdown>
                </div>
              </TabsContent>
              <TabsContent value="test">
                <div className="prose dark:prose-invert">
                  <h2 className="text-xl font-bold">Tester l'API</h2>
                  <p>
                    Utilisez les paramètres et les champs ci-dessous pour tester
                    les appels à l'API.
                  </p>
                  {/* Zone de test API (formulaire ou autre composant) */}
                  <form>
                    <div className="mb-4">
                      <label
                        htmlFor="endpoint"
                        className="block text-sm font-medium"
                      >
                        Endpoint
                      </label>
                      <input
                        type="text"
                        id="endpoint"
                        placeholder={dataset.sourceURL}
                        className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="mb-4">
                      <label
                        htmlFor="params"
                        className="block text-sm font-medium"
                      >
                        Paramètres
                      </label>
                      <textarea
                        id="params"
                        rows={4}
                        placeholder='{"key": "value"}'
                        className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <Button type="submit">Tester</Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </main>

          {/* Colonne droite : Informations */}
          <aside className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Informations</h2>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-1" />
                <span>{dataset.provider.name}</span>
              </div>
              <Button variant="outline" asChild>
                <a href={`mailto:${dataset.provider.contact}`}>
                  Contacter le fournisseur
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm">
                <strong>Version :</strong> 1.0.0
              </p>
              <p className="text-sm flex ">
                <strong>Base URL :</strong>{" "}
                <pre className="ml-2">{dataset.sourceURL}</pre>
              </p>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// Composant Badge
const Badge = ({
  content,
  type,
}: {
  content: string;
  type: "success" | "warning";
}) => {
  const typeClasses =
    type === "success"
      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100";
  return (
    <span
      className={`text-sm px-3 py-1 rounded-full font-medium ${typeClasses}`}
    >
      {content}
    </span>
  );
};
