import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DatasetDetail from "./pages/details/Detail";
import DataUniverse from "./pages/DataUniverse";
import ApiUniverse from "./pages/ApiUniverse";
import ScrollDownArrow from "./components/ScrollDownArrow";
import Detail from "./pages/details/Detail";
import ScrollToTop from "./components/ScrollToTop";
import GeoUniverse from "./pages/GeoUniverse";
import MapDetail from "./pages/details/MapDetail";
import { HelmetProvider } from "react-helmet-async";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<DataUniverse />} />
          <Route path="/geo" element={<GeoUniverse />} />
          <Route path="/api" element={<ApiUniverse />} />
          <Route path="/api/:id" element={<Detail />} />
          <Route path="/dataset/:id" element={<Detail />} />
          <Route path="/map/:id" element={<MapDetail />} />
          <Route path="*" element={<DataUniverse />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
