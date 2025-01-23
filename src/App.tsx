import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DatasetDetail from "./pages/DatasetDetail";
import GettingStarted from "./pages/GettingStarted";
import Auth from "./pages/Auth";
import ApiDetail from "./pages/ApiDetail";
import DataUniverse from "./pages/DataUniverse";
import ApiUniverse from "./pages/ApiUniverse";
import ScrollDownArrow from "./components/ScrollDownArrow";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DataUniverse />} />
        <Route path="/api" element={<ApiUniverse />} />
        <Route path="/api/:id" element={<ApiDetail />} />
        <Route path="/dataset/:id" element={<DatasetDetail />} />
        <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Router>
  );
}

export default App;
