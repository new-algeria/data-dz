import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Database } from "lucide-react";
import { Dataset } from "@/interface/DatasetInterface";
import { fetchData } from "@/lib/axios";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCode,
  faDownload,
  faEye,
  faGlobe,
  faKey,
  faPen,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { FaCircle } from "react-icons/fa";
import { DataSearch, SubmitDatasetBtn } from "@/components/dataset/DataSearch";
import { ApiSearch } from "@/components/api/ApiSearch";
import CustomMarkdown from "@/components/CustomMarkdown";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Spinner } from "flowbite-react/components/Spinner";
import { RainbowButton } from "@/components/ui/RgbBtn";
import { BoxReveal } from "@/components/ui/BoxReveal";
import { useTranslation } from "react-i18next";
import { renderTable, GraphComponent } from "./DetailCharts";

const Detail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [fetching, setFetching] = useState(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [displayFormat, setDisplayFormat] = useState("json");
  const [availableFormats, setAvailableFormats] = useState([
    "graph",
    "table",
    "json",
    "csv",
  ]);
  const [weAreInDataPortal, setWeAreInDataPortal] = useState(false);
  const [isDynamicRessource, setIsDynamicRessource] = useState(false);

  // Pour les graphiques
  /*   const [numericalColumns, setNumericalColumns] = useState<string[]>([]);
  const [absisColumn, setAbsisColumn] = useState<string>("");
  const [ordinateColumn, setOrdinateColumn] = useState<string>(""); */

  const isMultiDimensional = (data: Dataset) => {
    if (!data?.preview) return false;
    let multi = false;
    const checkObj = (val: any) => {
      if ((val && typeof val === "object") || Array.isArray(val)) {
        multi = true;
      }
    };
    if (Array.isArray(data.preview)) {
      data.preview.forEach((item) => {
        Object.values(item).forEach(checkObj);
      });
    } else {
      Object.values(data.preview).forEach(checkObj);
    }
    return multi;
  };

  const paymentProcess = async () => {};

  const fetchApis = async () => {
    try {
      if (!window.location.pathname.includes("api")) {
        setWeAreInDataPortal(true);
      }
      const data: Dataset = await fetchData(
        `${import.meta.env.VITE_API_URL}/details/${id}`
      );

      // Check if the data is multi-dimensional => if so, we can't display it as a table, only as JSON
      if (isMultiDimensional(data)) {
        if (data.path.includes("geojson")) {
          setAvailableFormats(["json", "geojson"]);
          setDisplayFormat("json");
        } else {
          setAvailableFormats(["json"]);
          setDisplayFormat("json");
        }
      }
      if (data.type !== "file") setIsDynamicRessource(true);
      setDataset(data);
      setFetching(false);
    } catch (error) {
      console.log(error);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [id]);

  const renderContent = () => {
    if (!dataset?.preview) return <div>{t("detail.noPreview")}</div>;

    switch (displayFormat) {
      case "graph":
        return Array.isArray(dataset.preview) ? (
          <GraphComponent data={dataset.preview} />
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faEye} />
              <span>{t("detail.graphComingSoon")}</span>
            </div>
          </div>
        );
      case "table":
        return Array.isArray(dataset.preview) ? (
          renderTable(dataset.preview)
        ) : (
          <div>{t("detail.noTable")}</div>
        );
      case "json":
        return (
          <div
            style={{
              maxHeight: "400px",
              overflow: "auto",
              paddingRight: "10px",
              scrollbarColor: "#6F15E6FF #f3f4f6",

              scrollBehavior: "smooth",

              borderRadius: "5px",
            }}
          >
            <div className="rounded-md">
              <pre>{JSON.stringify(dataset.preview, null, 2)}</pre>
            </div>
          </div>
        );
      case "csv":
        if (!Array.isArray(dataset.preview))
          return <div>{t("detail.noCSV")}</div>;
        const csvData = [
          Object.keys(dataset.preview[0]).join(","),
          ...dataset.preview.map((row) =>
            Object.values(row)
              .map((value) => `"${value}"`)
              .join(",")
          ),
        ].join("\n");
        return <pre>{csvData}</pre>;
      case "geojson":
        console.log(dataset.preview);
        return <div>{t("detail.geojsonComingSoon")}</div>;
        return (
          <MapContainer
          //center={[25.513483, -5.668261]}
          //zoom={5}
          //style={{ height: "400px", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <GeoJSON data={dataset.preview} />
          </MapContainer>
        );
      //return <div>Aucun geojson possible</div>;
      /*  return (
          <MapContainer
            center={[51.505, -0.09]}
            zoom={13}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[51.505, -0.09]}>
              <Popup>
                A pretty CSS3 popup. <br /> Easily customizable.
              </Popup>
            </Marker>
          </MapContainer>
        ); */

      default:
        return <div>{t("detail.unsupportedFormat")}</div>;
    }
  };

  const FormatSelector = () => (
    <div className="flex flex-wrap gap-4 mb-4">
      {availableFormats.includes("graph") && (
        <label className="flex items-center">
          <input
            type="radio"
            name="format"
            value="graph"
            checked={displayFormat === "graph"}
            onChange={() => setDisplayFormat("graph")}
            className="mr-2"
          />
          {t("detail.graph")}
        </label>
      )}
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
          {t("detail.table")}
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
          {t("detail.json")}
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
          {t("detail.csv")}
        </label>
      )}
      {availableFormats.includes("geojson") && (
        <label className="flex items-center">
          <input
            type="radio"
            name="format"
            value="geojson"
            checked={displayFormat === "geojson"}
            onChange={() => setDisplayFormat("geojson")}
            className="mr-2"
          />
          {t("detail.geojson")}
        </label>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      {fetching && (
        <div className="flex justify-center items-center h-screen">
          <Spinner aria-label={t("detail.loading")} className="w-16 h-16" />
        </div>
      )}
      {!fetching && dataset && (
        <>
          <main className="flex-grow container mx-auto px-4 py-8 mt-20">
            <Button variant="outline" asChild>
              <a href="/">
                <FontAwesomeIcon icon={faArrowLeft} />
                {t("detail.back")}
              </a>
            </Button>
            <div className="space-y-8 mt-2">
              <BoxReveal boxColor={"#5046e6"} duration={0.5}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <h1 className="text-4xl font-bold mb-4">
                      {dataset.title[t("common.language")]}
                    </h1>
                    {/*    <pre className="text-lg font-semibold text-green-400 dark:text-green-300 -mt-3">
                      {`{${dataset.slug}}`}
                    </pre> */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {dataset.keywords.en.map((keyword) => (
                        <Badge key={keyword} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
                      {dataset.description[t("common.language")]}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {weAreInDataPortal ? (
                      <>
                        <BtnDownloadAPI />
                        <BtnGoToAPI slug={dataset.slug} />
                      </>
                    ) : (
                      <BtnSubscribeAPI />
                    )}
                  </div>
                </div>
              </BoxReveal>

              <BoxReveal boxColor={"#5046e6"} duration={0.5}>
                <div className="flex flex-wrap gap-4 items-center">
                  {isDynamicRessource ? (
                    <span className="flex items-center animate-pulse text-green-500">
                      <FaCircle className="w-3 h-3 mr-1" />
                      {t("detail.ready")}
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center">
                        <Database className="w-4 h-4 mr-2" />
                        {dataset.length} {t("detail.records")}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {t("detail.updatedOn")} {dataset.updatedDate}
                      </span>
                    </>
                  )}
                  {weAreInDataPortal ? (
                    <span className="flex items-center">
                      {dataset.type === "file" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("detail.formats")} :
                          </span>
                          <Badge className="bg-blue-500 text-white">CSV</Badge>
                          <Badge className="bg-yellow-300 text-white">
                            JSON
                          </Badge>
                          <Badge className="bg-red-500 text-white">XML</Badge>
                          <Badge className="bg-green-500 text-white">XLS</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("detail.api")}
                          </span>
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
                      <FaCircle className="w-3 h-3 mr-1" />
                      {t("detail.ready")}
                    </span>
                  )}
                </div>
              </BoxReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <main className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  {weAreInDataPortal ? (
                    <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold">
                          {t("detail.dataExcerpt")}
                        </h2>
                      </div>
                      <FormatSelector />
                      <div className="prose dark:prose-invert">
                        {renderContent()}
                      </div>
                    </div>
                  ) : (
                    <Tabs defaultValue="Documentation">
                      <TabsList className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
                        <TabsTrigger
                          value="Documentation"
                          className="px-4 py-2 text-sm font-medium"
                        >
                          🗒️ {t("detail.documentation")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="data"
                          className="px-4 py-2 text-sm font-medium"
                        >
                          🚀 {t("detail.apiReturn")}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="Documentation">
                        <div className="prose dark:prose-invert">
                          <CustomMarkdown content={dataset.descriptionREADME} />
                        </div>
                      </TabsContent>
                      <TabsContent value="data">
                        <FormatSelector />
                        <div className="prose dark:prose-invert">
                          {renderContent()}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </main>

                <aside className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-2xl font-semibold mb-4">
                    {t("detail.information")}
                  </h2>
                  <div className="flex items-center mb-4">
                    <img
                      src={dataset.provider.pictureUrl}
                      alt={dataset.provider.name}
                      className="w-6 h-6 mr-1 rounded-full border border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-lg ml-2">
                      {dataset.provider.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-evenly mb-4">
                    <Button variant="outline" asChild>
                      <a href={`mailto:${dataset.provider.contact}`}>
                        <FontAwesomeIcon icon={faPen} />
                        {t("detail.contactProvider")}
                      </a>
                    </Button>
                    {dataset.provider.website && (
                      <Button variant="outline" asChild>
                        <a href={dataset.provider.website}>
                          <FontAwesomeIcon icon={faGlobe} />
                          {t("detail.website")}
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {dataset.source && (
                      <p className="text-sm">
                        <strong>{t("detail.source")} :</strong> {dataset.source}
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </main>
          {/* Vous cherchez à  */}
          {weAreInDataPortal && (
            <div className="text-center flex flex-col gap-4 items-center justify-center md:flex-row">
              <span className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                {t("une-derniere-chance")}{" "}
              </span>
              <BtnDownloadAPI /> {/* <BtnSubscribeAPI /> */}
              {/*  <BtnGoToAPI slug={dataset.slug} /> */}
            </div>
          )}
        </>
      )}

      {!fetching && !dataset && (
        <div className="flex flex-col justify-center items-center h-80">
          <h1 className="text-2xl flex flex-col gap-2 items-center text-center">
            <pre className="text-2xl font-semibold">{id}</pre>
            {t("detail.notFound")}
            <SubmitDatasetBtn />
          </h1>
        </div>
      )}

      <hr className="my-8 dark:border-gray-700 border-gray-300 w-1/3 mx-auto" />
      <div className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-4">
            {t("detail.searchMore")}
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

export function BtnSubscribeAPI() {
  const { t } = useTranslation();
  return (
    <a
      href={"https://rapidapi.com/Newalgeria/api/api-dz/pricing"}
      target="_blank"
    >
      <div className="flex flex-col items-start">
        <RainbowButton className="text-white bg-gradient-to-r from-green-500 to-green-700 dark:bg-gradient-to-r">
          <FontAwesomeIcon icon={faKey} className="mr-2 text-yellow-300" />
          {t("sabonner-sur")}{" "}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/RapidAPI_logo.svg/2560px-RapidAPI_logo.svg.png"
            className="w-22 h-6 ml-1 mt-1"
            alt="RapidAPI"
          />
        </RainbowButton>
      </div>
    </a>
  );
}

export function BtnDownloadAPI() {
  const { t } = useTranslation();
  return (
    <RainbowButton className=" text-white dark:bg-gradient-to-r  bg-gradient-to-r from-green-500 to-green-700">
      <FontAwesomeIcon icon={faDownload} className="mr-2 " />
      {t("download")}{" "}
    </RainbowButton>
  );
}

export function BtnGoToAPI({ slug = "a" }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <a href={"/api/" + slug}>
      <Button className="bg-purple-500 text-white hover:bg-purple-600">
        <FontAwesomeIcon icon={faCode} />
        {t("detail.viewAssociatedAPI")}
      </Button>
    </a>
  );
}
