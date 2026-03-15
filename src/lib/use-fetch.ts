import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * SWR-based data fetching hook with automatic caching, deduplication, and revalidation.
 * Replaces manual useState + useEffect + fetch patterns.
 */
export function useFetch<T = unknown>(url: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000, // dedupe requests within 5s
  });

  return {
    data,
    error,
    loading: isLoading,
    refresh: mutate,
  };
}
