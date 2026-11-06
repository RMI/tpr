/// <reference types="vite/client" />
// App.tsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import Header from "./components/Header";
import Footer from "./components/Footer";
import NewsletterCta from "./components/NewsletterCta";
import LegalPage from "./pages/LegalPage";
import PathwaySearch from "./pages/PathwaySearch";
import PathwayDetailPage from "./pages/PathwayDetailPage";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import GetUpdatesPage from "./pages/GetUpdatesPage";
import EnvironmentBanner from "./components/EnvironmentBanner";
import { FilterProvider } from "./context/FilterContext";
import { ComparisonProvider } from "./context/ComparisonContext";
import { NewsletterSignupProvider } from "./context/NewsletterSignupContext";
import ComparisonPage from "./pages/ComparisonPage";
import {
  ResourcesFaqPage,
  ResourcesHowToChooseAPathwayPage,
  ResourcesMethodologyPage,
  ResourcesUpdatesPage,
  ResourcesUseCasesPage,
} from "./pages/resources";

// Export the inner content for testing
export const AppContent = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  // The signup page already shows the form, so it needs no ribbon opening
  // another copy of it in a dialog.
  const showNewsletterRibbon =
    !isLandingPage && location.pathname !== "/get-updates";

  // The signup provider renders the one signup dialog, around the routes so it
  // stays open (form and all) when navigation between the landing page and an
  // inner page unmounts the button that opened it.
  return (
    <NewsletterSignupProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <EnvironmentBanner />
        {!isLandingPage && <Header />}
        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={<LandingPage />}
            />
            <Route
              path="/pathway"
              element={<PathwaySearch />}
            />
            <Route
              path="/pathway/:id"
              element={<PathwayDetailPage />}
            />
            <Route
              path="/compare"
              element={<ComparisonPage />}
            />
            <Route
              path="/legal"
              element={<LegalPage />}
            />

            <Route
              path="/get-updates"
              element={<GetUpdatesPage />}
            />
            <Route
              path="/contact"
              element={<ContactPage />}
            />

            <Route
              path="/resources/methodology"
              element={<ResourcesMethodologyPage />}
            />
            <Route
              path="/resources/how-to-choose-a-pathway"
              element={<ResourcesHowToChooseAPathwayPage />}
            />
            <Route
              path="/resources/faq"
              element={<ResourcesFaqPage />}
            />
            <Route
              path="/resources/use-cases"
              element={<ResourcesUseCasesPage />}
            />
            <Route
              path="/resources/updates"
              element={<ResourcesUpdatesPage />}
            />
          </Routes>
        </main>
        {showNewsletterRibbon && <NewsletterCta />}
        {!isLandingPage && <Footer />}
      </div>
    </NewsletterSignupProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <ComparisonProvider>
          <AppContent />
        </ComparisonProvider>
      </FilterProvider>
    </BrowserRouter>
  );
}

export default App;
