import useSWR from "swr";

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json() as Promise<T>;
}

/**
 * SWR-based data fetching hook with automatic caching, deduplication, and revalidation.
 * Replaces manual useState + useEffect + fetch patterns.
 */
export function useFetch<T = unknown>(url: string | null) {
  const swrKey = url ? [url] as const : null;
  const { data, error, isLoading, mutate } = useSWR<T>(
    swrKey,
    ([requestUrl]) => fetcher<T>(requestUrl),
    {
    revalidateOnFocus: false,
    dedupingInterval: 5000, // dedupe requests within 5s
    }
  );

  return {
    data,
    error,
    loading: isLoading,
    refresh: mutate,
  };
}
