import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { PlaceholdersAndVanishInput } from "../ui/placeholders-and-vanish-input";
import { SparklesText } from "../ui/sparkles-text";
import { DatasetCard } from "./DatasetCard";
import { useEffect, useState } from "react";
import { Dataset } from "@/interface/DatasetInterface";
import { fetchData } from "@/lib/axios";
import { t } from "i18next";
import { useTranslation } from "react-i18next";

const placeholders = [
  "Election présidentielle 2024",
  "Covid-19 Algérie",
  "Statistiques économiques",
  "Météo Oran",
];

export const DataSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [sortCriteria, setSortCriteria] = useState("relevance");
  const { t } = useTranslation();

  const fetchApis = async () => {
    const data = await fetchData(`${import.meta.env.VITE_API_URL}/info`);

    setDatasets(data);
    setFilteredDatasets(data);
  };
  useEffect(() => {
    fetchApis();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterAndSortDatasets(query, sortCriteria);
  };

  const handleSortChange = (value: string) => {
    setSortCriteria(value);
    filterAndSortDatasets(searchQuery, value);
  };

  const filterAndSortDatasets = (query: string, sort: string) => {
    let filtered = datasets.filter(
      (dataset) =>
        dataset.title.en.toLowerCase().includes(query.toLowerCase()) ||
        dataset.keywords.en.some((keyword) =>
          keyword.toLowerCase().includes(query.toLowerCase())
        ) ||
        dataset.description.en.toLowerCase().includes(query.toLowerCase()) ||
        dataset.provider.name.toLowerCase().includes(query.toLowerCase())
    );

    if (sort === "date") {
      filtered = filtered.sort(
        (a, b) =>
          new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime()
      );
    } else if (sort === "popularity") {
      //filtered = filtered.sort((a, b) => b.views - a.views);
    }

    setFilteredDatasets(filtered);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };

  return (
    <section className="py-6 px-4 mt-5 bg-accent dark:bg-inherit">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <SparklesText
          className="text-2xl font-bold mb-2 text-center"
          text={t("dataset.search.title")}
        />

        <div className="flex justify-start">
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={handleChange}
            onSubmit={onSubmit}
          />
        </div>

        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">{filteredDatasets.length} results</p>
          <Select defaultValue="relevance" onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Pertinence</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="popularity">Popularité</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map((dataset) => (
            <motion.div
              key={dataset.slug}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <DatasetCard {...dataset} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
