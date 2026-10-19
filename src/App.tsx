import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ScrollToTop from "./components/ScrollToTop";
import { RouteProtegee } from "./components/auth/RouteProtegee";
import Catalogue from "./pages/Catalogue";
import FicheDonnee from "./pages/FicheDonnee";

// Pages des comptes, chargées à la demande pour ne pas alourdir l'accueil.
const Connexion = lazy(() => import("./pages/auth/Connexion"));
const Inscription = lazy(() => import("./pages/auth/Inscription"));
const MotDePasseOublie = lazy(() => import("./pages/auth/MotDePasseOublie"));
const NouveauMotDePasse = lazy(() => import("./pages/auth/NouveauMotDePasse"));
const RetourAuth = lazy(() => import("./pages/auth/RetourAuth"));
const Profil = lazy(() => import("./pages/Profil"));
const PageMembre = lazy(() => import("./pages/PageMembre"));

// Les anciens liens /dataset/:slug pointent désormais vers /donnees/:slug.
const RedirectionAncienneFiche = () => {
  const { slug } = useParams();
  return <Navigate to={`/donnees/${slug ?? ""}`} replace />;
};

const ChargementPage = () => (
  <div className="flex min-h-screen items-center justify-center" role="status">
    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-hidden />
  </div>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<ChargementPage />}>
        <Routes>
          <Route path="/" element={<Catalogue />} />
          <Route path="/donnees/:slug" element={<FicheDonnee />} />
          <Route path="/dataset/:slug" element={<RedirectionAncienneFiche />} />

          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
          <Route path="/auth/retour" element={<RetourAuth />} />
          <Route
            path="/profil"
            element={
              <RouteProtegee>
                <Profil />
              </RouteProtegee>
            }
          />
          <Route path="/membres/:pseudo" element={<PageMembre />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
