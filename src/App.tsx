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
      <Routes>
        <Route path="/" element={<DataUniverse />} />
        <Route path="/api" element={<ApiUniverse />} />
        <Route path="/api/:id" element={<Detail />} />
        <Route path="/dataset/:id" element={<Detail />} />
        {/*    <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/auth" element={<Auth />} /> */}
        <Route path="*" element={<DataUniverse />} />
      </Routes>
    </Router>
  );
}

export default App;
