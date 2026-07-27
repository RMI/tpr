import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppContent } from "./App";

vi.mock("./pages/LandingPage", () => ({
  default: () => <div data-testid="mock-homepage">LandingPage</div>,
}));

vi.mock("./pages/resources", () => ({
  ResourcesFaqPage: () => <div>Faq Page</div>,
  ResourcesHowToChooseAPathwayPage: () => (
    <div data-testid="mock-how-to-choose-page">How To Choose A Pathway</div>
  ),
  ResourcesMethodologyPage: () => <div>Methodology Page</div>,
  ResourcesUpdatesPage: () => <div>Updates Page</div>,
  ResourcesUseCasesPage: () => <div>Use Cases Page</div>,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe("App component", () => {
  it("renders the LandingPage component", () => {
    render(
      <MemoryRouter>
        <AppContent />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("mock-homepage")).toBeInTheDocument();
  });

  it("renders the canonical how-to-choose-a-pathway route", () => {
    render(
      <MemoryRouter initialEntries={["/resources/how-to-choose-a-pathway"]}>
        <AppContent />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-how-to-choose-page")).toBeInTheDocument();
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/resources/how-to-choose-a-pathway",
    );
  });
});
