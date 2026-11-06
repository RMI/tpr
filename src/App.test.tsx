import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  type NavigateFunction,
  useLocation,
  useNavigate,
} from "react-router";
import { AppContent } from "./App";

vi.mock("./pages/LandingPage", () => ({
  default: () => <div data-testid="mock-homepage">LandingPage</div>,
}));

vi.mock("./pages/ContactPage", () => ({
  default: () => <div data-testid="mock-contact-page">Contact Page</div>,
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

  it("shows the newsletter ribbon above the footer on inner pages (#995)", () => {
    render(
      <MemoryRouter initialEntries={["/contact"]}>
        <AppContent />
      </MemoryRouter>,
    );

    const ribbon = screen.getByRole("region", {
      name: "Stay up to date with the TPR",
    });
    const footer = screen.getByRole("contentinfo");
    expect(
      ribbon.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leaves the ribbon off the landing page, which has a signup button in its hero", () => {
    render(
      <MemoryRouter>
        <AppContent />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("region", { name: "Stay up to date with the TPR" }),
    ).not.toBeInTheDocument();
  });

  it("serves the signup page at /get-updates, with no ribbon to open a second copy of the form", () => {
    render(
      <MemoryRouter initialEntries={["/get-updates"]}>
        <AppContent />
      </MemoryRouter>,
    );

    expect(screen.getByTitle(/newsletter signup form/i)).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Stay up to date with the TPR" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the open signup form when navigation unmounts the ribbon (Back to /)", async () => {
    let navigate: NavigateFunction = () => {};
    const CaptureNavigate = () => {
      navigate = useNavigate();
      return null;
    };
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/contact"]}>
        <AppContent />
        <CaptureNavigate />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Sign up for updates" }),
    );
    const form = screen.getByTitle(/newsletter signup form/i);

    // Leaving the inner pages unmounts the ribbon that opened the dialog.
    await act(() => navigate("/"));

    expect(
      screen.queryByRole("region", { name: "Stay up to date with the TPR" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Sign up for TPR updates" }),
    ).toHaveAttribute("open");
    // The same iframe, not a reloaded one: whatever was typed survives.
    expect(screen.getByTitle(/newsletter signup form/i)).toBe(form);
  });
});
