import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, type Params } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import ScrollToTop from "./components/ScrollToTop";
import { RouteProtegee } from "./components/auth/RouteProtegee";
import { RouteModerateur } from "./components/moderation/RouteModerateur";
import { routes } from "./lib/routes";
import Catalogue from "./pages/Catalogue";
import FicheDonnee from "./pages/FicheDonnee";

// Pages chargées à la demande pour ne pas alourdir l'accueil.
const Connexion = lazy(() => import("./pages/auth/Connexion"));
const Inscription = lazy(() => import("./pages/auth/Inscription"));
const MotDePasseOublie = lazy(() => import("./pages/auth/MotDePasseOublie"));
const NouveauMotDePasse = lazy(() => import("./pages/auth/NouveauMotDePasse"));
const RetourAuth = lazy(() => import("./pages/auth/RetourAuth"));
const Profil = lazy(() => import("./pages/Profil"));
const PageMembre = lazy(() => import("./pages/PageMembre"));
const Confidentialite = lazy(() => import("./pages/legal/Confidentialite"));
const Conditions = lazy(() => import("./pages/legal/Conditions"));
const Proposer = lazy(() => import("./pages/propositions/Proposer"));
const MesPropositions = lazy(() => import("./pages/propositions/MesPropositions"));
const MaProposition = lazy(() => import("./pages/propositions/MaProposition"));
const FileModeration = lazy(() => import("./pages/moderation/FileModeration"));
const RevueProposition = lazy(() => import("./pages/moderation/RevueProposition"));
const ModerationDatasets = lazy(() => import("./pages/moderation/ModerationDatasets"));
const Favoris = lazy(() => import("./pages/communaute/Favoris"));

/**
 * Redirige une ancienne URL française vers la nouvelle, en gardant ?… et #… :
 * indispensable pour les liens d'email déjà envoyés (?code=, ?suite=…).
 */
const RedirectionAncienne = ({ vers }: { vers: (parametres: Params) => string }) => {
  const parametres = useParams();
  const emplacement = useLocation();
  return <Navigate to={`${vers(parametres)}${emplacement.search}${emplacement.hash}`} replace />;
};

const ancienneUrl = (chemin: string, vers: (parametres: Params) => string) => (
  <Route key={chemin} path={chemin} element={<RedirectionAncienne vers={vers} />} />
);

const ChargementPage = () => (
  <div className="flex min-h-screen items-center justify-center" role="status">
    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-hidden />
  </div>
);

const protegee = (page: ReactNode) => <RouteProtegee>{page}</RouteProtegee>;
const moderateur = (page: ReactNode) => (
  <RouteProtegee>
    <RouteModerateur>{page}</RouteModerateur>
  </RouteProtegee>
);

function App() {
  const { i18n } = useTranslation();
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="bottom-center" richColors closeButton dir={i18n.dir()} />
      <Suspense fallback={<ChargementPage />}>
        <Routes>
          <Route path={routes.accueil} element={<Catalogue />} />
          <Route path="/datasets/:slug" element={<FicheDonnee />} />

          <Route path={routes.connexion} element={<Connexion />} />
          <Route path={routes.inscription} element={<Inscription />} />
          <Route path={routes.motDePasseOublie} element={<MotDePasseOublie />} />
          <Route path={routes.nouveauMotDePasse} element={<NouveauMotDePasse />} />
          <Route path={routes.retourAuth} element={<RetourAuth />} />
          <Route path={routes.profil} element={protegee(<Profil />)} />
          <Route path="/members/:pseudo" element={<PageMembre />} />

          <Route path={routes.proposer} element={protegee(<Proposer />)} />
          <Route path={routes.mesPropositions} element={protegee(<MesPropositions />)} />
          <Route path="/my-submissions/:id" element={protegee(<MaProposition />)} />

          <Route path={routes.favoris} element={protegee(<Favoris />)} />

          <Route path={routes.moderation} element={moderateur(<FileModeration />)} />
          <Route path="/moderation/submissions/:id" element={moderateur(<RevueProposition />)} />
          <Route path={routes.moderationDatasets} element={moderateur(<ModerationDatasets />)} />

          <Route path={routes.confidentialite} element={<Confidentialite />} />
          <Route path={routes.conditions} element={<Conditions />} />

          {/* Anciennes URL françaises : redirection permanente vers les URL anglaises. */}
          {ancienneUrl("/donnees/:slug", (p) => routes.donnee(p.slug ?? ""))}
          {ancienneUrl("/dataset/:slug", (p) => routes.donnee(p.slug ?? ""))}
          {ancienneUrl("/membres/:pseudo", (p) => routes.membre(p.pseudo ?? ""))}
          {ancienneUrl("/profil", () => routes.profil)}
          {ancienneUrl("/connexion", () => routes.connexion)}
          {ancienneUrl("/inscription", () => routes.inscription)}
          {ancienneUrl("/mot-de-passe-oublie", () => routes.motDePasseOublie)}
          {ancienneUrl("/nouveau-mot-de-passe", () => routes.nouveauMotDePasse)}
          {ancienneUrl("/auth/retour", () => routes.retourAuth)}
          {ancienneUrl("/confidentialite", () => routes.confidentialite)}
          {ancienneUrl("/conditions", () => routes.conditions)}
          {ancienneUrl("/mes-propositions", () => routes.mesPropositions)}
          {ancienneUrl("/mes-propositions/:id", (p) => routes.maProposition(p.id ?? ""))}
          {ancienneUrl("/moderation/propositions/:id", (p) => routes.moderationProposition(p.id ?? ""))}

          <Route path="*" element={<Navigate to={routes.accueil} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
