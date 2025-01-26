import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DatasetDetail from "./pages/details/Detail";

import ApiDetail from "./pages/details/ApiDetail";
import DataUniverse from "./pages/DataUniverse";
import ApiUniverse from "./pages/ApiUniverse";
import ScrollDownArrow from "./components/ScrollDownArrow";
import Detail from "./pages/details/Detail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DataUniverse />} />
        <Route path="/api" element={<ApiUniverse />} />
        <Route path="/api/:id" element={<Detail />} />
        <Route path="/dataset/:id" element={<Detail />} />
        {/*    <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/auth" element={<Auth />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
