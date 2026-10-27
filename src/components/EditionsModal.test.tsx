import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import EditionsModal from "./EditionsModal";
import { ComparisonProvider } from "../context/ComparisonContext";
import { FilterProvider } from "../context/FilterContext";
import { pathwayMetadata } from "../data/pathwayMetadata";
import type { PathwayMetadataType } from "../types";

/*
  Real corpus pathways, not fabricated ones: ComparisonContext resolves ids
  against `pathwayMetadata`, so an invented id would silently never reach the
  comparison and the ribbon assertions would pass against an empty tray.
*/
const real = (id: string): PathwayMetadataType => {
  const found = pathwayMetadata.find((p) => p.id === id);
  if (!found)
    throw new Error(`fixture drift: ${id} is no longer in the corpus`);
  return found;
};

const older = real("IEA-NZE-2024");
const newer = real("IEA-NZE-2025");
const editions = [older, newer] as const; // oldest first, as the grouper emits

const renderModal = (
  props: Partial<React.ComponentProps<typeof EditionsModal>> = {},
) =>
  render(
    <MemoryRouter>
      <FilterProvider>
        <ComparisonProvider>
          <EditionsModal
            editions={editions}
            open
            onClose={() => {}}
            {...props}
          />
        </ComparisonProvider>
      </FilterProvider>
    </MemoryRouter>,
  );

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.style.overflow = "";
});

describe("EditionsModal", () => {
  it("opens the native dialog and names itself by its title", () => {
    renderModal();
    expect(dialog().hasAttribute("open")).toBe(true);
    // The cards inside carry their own h2s, so resolve the dialog's label by
    // id rather than by role.
    const labelId = dialog().getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId as string);
    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent).toContain("Net Zero Emissions");
  });

  it("stays closed when open is false", () => {
    renderModal({ open: false });
    expect(dialog().hasAttribute("open")).toBe(false);
  });

  it("lists every edition, newest first", () => {
    renderModal();
    const years = screen
      .getAllByText(/^20\d\d$/)
      .map((n) => n.textContent)
      .filter((y) => y === "2024" || y === "2025");
    expect(years[0]).toBe("2025");
    expect(years).toContain("2024");
  });

  it("counts the editions in the eyebrow", () => {
    renderModal();
    expect(screen.getByText("2 editions of this pathway")).toBeTruthy();
  });

  it("renders the shared comparison ribbon inside the dialog", () => {
    // Inside, not relied on from the page: a modal dialog makes everything
    // outside the top layer inert.
    renderModal();
    expect(within(dialog()).getByText(/Compare Pathways/i)).toBeTruthy();
  });

  it("locks page scroll while open and restores it on unmount", () => {
    const { unmount } = renderModal();
    expect(document.documentElement.style.overflow).toBe("hidden");
    // Navigating away from inside the modal unmounts it without a close event.
    unmount();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("closes from the X button", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the dialog fires close, which is what Esc does", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    dialog().dispatchEvent(new Event("close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders no pill on the cards inside it", () => {
    // Each card in here is a single edition, so it gets no `editions` prop.
    renderModal();
    expect(screen.queryByRole("button", { name: /See all/i })).toBeNull();
  });

  it("renders nothing when given no editions", () => {
    const { container } = render(
      <MemoryRouter>
        <ComparisonProvider>
          <EditionsModal
            editions={[]}
            open
            onClose={() => {}}
          />
        </ComparisonProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector("dialog")).toBeNull();
  });
});

describe("EditionsModal with filtered-out editions", () => {
  it("shows no explanation when nothing is excluded", () => {
    renderModal();
    expect(screen.queryByText(/shown for reference/i)).toBeNull();
  });

  it("explains why an excluded edition cannot be used", () => {
    renderModal({ excludedIds: [older.id] });
    expect(
      screen.getByText(/shown for reference and cannot be opened/i),
    ).toBeTruthy();
  });

  it("blocks BOTH links on an excluded card, not just View Details", () => {
    // A card carries two links to the same pathway: its title and the View
    // Details button. Blocking only one leaves the edition openable.
    renderModal({ excludedIds: [older.id] });
    const links = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === `/pathway/${older.id}`);
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) {
      expect(link.getAttribute("aria-disabled")).toBe("true");
    }
  });

  it("marks the excluded card disabled but leaves it reachable", () => {
    // aria-disabled rather than `disabled` or pointer-events-none: both of
    // those also kill hover and focus, and the card must stay readable.
    renderModal({ excludedIds: [older.id] });
    const link = screen
      .getAllByRole("link", { name: /View Details/i })
      .find((a) => a.getAttribute("href") === `/pathway/${older.id}`);
    expect(link?.getAttribute("aria-disabled")).toBe("true");
    expect(link?.hasAttribute("disabled")).toBe(false);
  });

  it("points the excluded card at the explanation", () => {
    renderModal({ excludedIds: [older.id] });
    const note = screen.getByText(/shown for reference/i);
    const card = document.querySelector("[aria-describedby]");
    expect(card?.getAttribute("aria-describedby")).toBe(note.id);
  });

  it("leaves the matching edition fully usable", () => {
    renderModal({ excludedIds: [older.id] });
    const link = screen
      .getAllByRole("link", { name: /View Details/i })
      .find((a) => a.getAttribute("href") === `/pathway/${newer.id}`);
    expect(link?.getAttribute("aria-disabled")).toBeNull();
  });
});
