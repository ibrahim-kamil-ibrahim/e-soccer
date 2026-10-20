import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchOverlay } from "./SearchOverlay.jsx";

const teamList = vi.fn();
const playerList = vi.fn();
const competitionList = vi.fn();
const newsList = vi.fn();

vi.mock("../../services/teamService.js", () => ({ teamService: { list: (...a) => teamList(...a) } }));
vi.mock("../../services/playerService.js", () => ({ playerService: { list: (...a) => playerList(...a) } }));
vi.mock("../../services/competitionService.js", () => ({ competitionService: { list: (...a) => competitionList(...a) } }));
vi.mock("../../services/newsService.js", () => ({ newsService: { list: (...a) => newsList(...a) } }));

function renderOverlay(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <SearchOverlay isOpen={true} onClose={onClose} />
    </MemoryRouter>
  );
}

describe("SearchOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    teamList.mockResolvedValue({ items: [] });
    playerList.mockResolvedValue({ items: [] });
    competitionList.mockResolvedValue({ items: [] });
    newsList.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders open without crashing on an empty query", () => {
    renderOverlay();
    expect(screen.getByPlaceholderText(/search teams/i)).toBeInTheDocument();
    expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
    expect(teamList).not.toHaveBeenCalled();
  });

  it("returns null when closed", () => {
    render(
      <MemoryRouter>
        <SearchOverlay isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByPlaceholderText(/search teams/i)).not.toBeInTheDocument();
  });

  it("debounces search and renders results", async () => {
    teamList.mockResolvedValue({ items: [{ id: 7, name: "Dire Dawa Stars" }] });
    renderOverlay();
    fireEvent.change(screen.getByPlaceholderText(/search teams/i), { target: { value: "stars" } });
    expect(teamList).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText("Dire Dawa Stars")).toBeInTheDocument();
    expect(teamList).toHaveBeenCalledWith({ search: "stars", limit: 10 });
  });

  it("shows an empty state when a search returns nothing", async () => {
    renderOverlay();
    fireEvent.change(screen.getByPlaceholderText(/search teams/i), { target: { value: "zzzz" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it("does not fetch when the query is only whitespace", async () => {
    renderOverlay();
    fireEvent.change(screen.getByPlaceholderText(/search teams/i), { target: { value: "   " } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(teamList).not.toHaveBeenCalled();
    expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
  });

  it("clears results and skips fetching after closing the overlay", () => {
    const { rerender } = renderOverlay();
    rerender(
      <MemoryRouter>
        <SearchOverlay isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(teamList).not.toHaveBeenCalled();
  });
});
