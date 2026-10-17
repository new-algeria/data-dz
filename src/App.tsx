import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Catalogue from "./pages/Catalogue";
import FicheDonnee from "./pages/FicheDonnee";

// Les anciens liens /dataset/:slug pointent désormais vers /donnees/:slug.
const RedirectionAncienneFiche = () => {
  const { slug } = useParams();
  return <Navigate to={`/donnees/${slug ?? ""}`} replace />;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Catalogue />} />
        <Route path="/donnees/:slug" element={<FicheDonnee />} />
        <Route path="/dataset/:slug" element={<RedirectionAncienneFiche />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
