import { useQuery } from "@tanstack/react-query";
import { api, Hamlet } from "@/lib/api";

// Shared canonical hamlet list — every CRP screen that used to filter/target by
// the old hardcoded 2-item HAMLETS array now reads from here instead. All
// callers share the same "hamlets" query key, so React Query dedupes/caches
// the request instead of every screen firing its own GET /hamlets.
export function useHamlets() {
  const { data: hamlets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["hamlets"],
    queryFn: () => api.getHamlets(),
    staleTime: 5 * 60_000,
  });
  return { hamlets, hamletsLoading: isLoading, hamletsError: isError, refetchHamlets: refetch };
}

// Display name resolver matching the pattern already used in ProfileTab.tsx —
// prefers the language-matched canonical name, falls back through nameEn/
// nameTa/name for hamlet documents created before nameTa/nameEn existed.
export function hamletDisplayName(h: Hamlet, lang: string): string {
  return (lang === "en" ? h.nameEn || h.name : h.nameTa || h.name) || h.name || h._id;
}
