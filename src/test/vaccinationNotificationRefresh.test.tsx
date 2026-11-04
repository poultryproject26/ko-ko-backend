import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WeeklyUpdateTab from "@/components/dashboard/WeeklyUpdateTab";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { api } from "@/lib/api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("farmer vaccination request notification refresh", () => {
  it("invalidates the cached unread notifications after a successful request", async () => {
    localStorage.setItem("app_lang", "en");
    vi.spyOn(api, "getBirdUpdates").mockResolvedValue([]);
    vi.spyOn(api, "submitVaccinationStock").mockResolvedValue({
      dueDate: "2026-11-02T00:00:00.000Z",
      entryDate: "2026-10-30T15:00:00.000Z",
    } as Awaited<ReturnType<typeof api.submitVaccinationStock>>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <WeeklyUpdateTab />
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const categoryLabel = screen.getByText("Within 1 month age");
    const row = categoryLabel.parentElement?.parentElement;
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getAllByRole("button").at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Save Vaccination Requirements" }));

    await waitFor(() => {
      expect(api.submitVaccinationStock).toHaveBeenCalledOnce();
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["notifications", "unread"] });
    });
  });
});
