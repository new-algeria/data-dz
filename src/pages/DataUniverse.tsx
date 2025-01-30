import { motion } from "framer-motion";
import DataSearch from "@/components/dataset/DataSearch";
import Statistics from "@/components/Statistics";
import Supporters from "@/components/Supporters";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import { t } from "i18next";

const DataUniverse = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Navbar />
      <DataSearch />
      <Statistics />
      <Supporters />
      <ScrollDownArrow />
      <Footer />
    </motion.div>
  );
};

export default DataUniverse;
