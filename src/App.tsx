import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DatasetDetail from "./pages/details/Detail";
import DataUniverse from "./pages/DataUniverse";
import ApiUniverse from "./pages/ApiUniverse";
import ScrollDownArrow from "./components/ScrollDownArrow";
import Detail from "./pages/details/Detail";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<DataUniverse />} />
          <Route path="/api" element={<ApiUniverse />} />
          <Route path="/api/:id" element={<Detail />} />
          <Route path="/dataset/:id" element={<Detail />} />
          <Route path="*" element={<DataUniverse />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;