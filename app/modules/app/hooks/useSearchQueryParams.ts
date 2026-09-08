import type { FiltersValues } from "@/components/ui/filters";
import { useEffect, useState } from "react";
import { useNavigation, useSearchParams } from "react-router";

const DEBOUNCE_TIME = 600;

type DefaultQueryParams = {
  searchValue?: string;
  currentPage?: number;
  sortValue?: string;
  filters?: FiltersValues | null;
};

export function parseFiltersFromUrl(
  searchParams: URLSearchParams,
  defaultFilters?: FiltersValues | null,
  prefix: string = "",
): FiltersValues {
  const filterPrefix = prefix ? `${prefix}Filter_` : "filter_";

  const arrayFilterKeys = new Set<string>();
  if (defaultFilters) {
    for (const [key, defaultValue] of Object.entries(defaultFilters)) {
      if (Array.isArray(defaultValue)) arrayFilterKeys.add(key);
    }
  }

  const urlFilterKeys = new Set<string>();
  searchParams.forEach((_, key) => {
    if (key.startsWith(filterPrefix)) urlFilterKeys.add(key);
  });

  // If no filters in the URL: fall back to the defaults
  if (urlFilterKeys.size === 0) {
    const filters: FiltersValues = { ...(defaultFilters ?? {}) };
    for (const key of arrayFilterKeys) {
      if (!Array.isArray(filters[key])) filters[key] = [];
    }
    return filters;
  }

  const filters: FiltersValues = {};
  for (const key of arrayFilterKeys) filters[key] = [];
  for (const key of urlFilterKeys) {
    const filterKey = key.replace(filterPrefix, "");
    const values = searchParams.getAll(key);
    filters[filterKey] = arrayFilterKeys.has(filterKey) ? values : values[0];
  }
  return filters;
}

/**
 * Serialise filter values into a copy of `currentSearchParams`: existing
 * filter params are cleared, arrays become repeated params, scalars a single
 * param, and empty/null/"" values are omitted (so a cleared filter drops out).
 */
export function buildFilterSearchParams(
  currentSearchParams: URLSearchParams,
  value: FiltersValues,
  prefix: string = "",
): URLSearchParams {
  const newSearchParams = new URLSearchParams(currentSearchParams.toString());
  const filterPrefix = prefix ? `${prefix}Filter_` : "filter_";

  const keysToDelete: string[] = [];
  newSearchParams.forEach((_, paramKey) => {
    if (paramKey.startsWith(filterPrefix)) keysToDelete.push(paramKey);
  });
  keysToDelete.forEach((k) => newSearchParams.delete(k));

  Object.entries(value ?? {}).forEach(([filterKey, filterValue]) => {
    if (
      filterValue === null ||
      filterValue === undefined ||
      filterValue === ""
    ) {
      return;
    }

    const paramKey = `${filterPrefix}${filterKey}`;
    if (Array.isArray(filterValue)) {
      filterValue.forEach((entry) => {
        if (entry !== null && entry !== undefined && entry !== "") {
          newSearchParams.append(paramKey, entry);
        }
      });
    } else {
      newSearchParams.set(paramKey, filterValue);
    }
  });

  return newSearchParams;
}

/**
 * Ensure cleared array-typed filters stay as an empty array (never null/
 * undefined) so multi-select filters always receive an array.
 */
export function coerceClearedArrayFilters(
  value: FiltersValues,
  arrayFilterKeys: Iterable<string>,
): FiltersValues {
  const normalised: FiltersValues = { ...value };
  for (const key of arrayFilterKeys) {
    if (normalised[key] === null || normalised[key] === undefined) {
      normalised[key] = [];
    }
  }
  return normalised;
}

export function useSearchQueryParams(
  defaultQueryParams: DefaultQueryParams,
  options?: { paramPrefix?: string },
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  const prefix = options?.paramPrefix || "";
  const searchValueKey = prefix ? `${prefix}SearchValue` : "searchValue";
  const currentPageKey = prefix ? `${prefix}CurrentPage` : "currentPage";
  const sortKey = prefix ? `${prefix}Sort` : "sort";

  // Map to help filter array based keys for when finding an empty array.
  const arrayFilterKeys = new Set(
    Object.entries(defaultQueryParams.filters ?? {})
      .filter(([, defaultValue]) => Array.isArray(defaultValue))
      .map(([key]) => key),
  );

  const [searchValue, setSearchValueState] = useState<string>(
    searchParams.get(searchValueKey) ?? defaultQueryParams.searchValue ?? "",
  );

  const [currentPage, setCurrentPageState] = useState<number>(
    searchParams.get(currentPageKey)
      ? Number(searchParams.get(currentPageKey))
      : (defaultQueryParams.currentPage ?? 1),
  );

  const [sortValue, setSortValueState] = useState<string>(
    searchParams.get(sortKey) ?? defaultQueryParams.sortValue ?? "",
  );

  const [filtersValues, setFiltersValuesState] = useState<FiltersValues>(
    parseFiltersFromUrl(searchParams, defaultQueryParams.filters, prefix),
  );

  // isSyncing tracks two async phases to show the Collection "Syncing" indicator:
  // 1. isPending: user is typing but debounce hasn't fired yet (no navigation started)
  // 2. hasInitiatedNavigation: debounce fired (or pagination/sort/filter changed),
  //    React Router navigation is in progress, waiting for loader to return new data.
  // We need hasInitiatedNavigation so that unrelated navigations (e.g. clicking a
  // link to leave the page) don't briefly flash "Syncing" on the collection.
  const [isPending, setIsPending] = useState<boolean>(false);
  const [hasInitiatedNavigation, setHasInitiatedNavigation] = useState(false);

  useEffect(() => {
    if (
      searchValue ===
      (searchParams.get(searchValueKey) ?? defaultQueryParams.searchValue ?? "")
    ) {
      return;
    }

    setIsPending(true); // eslint-disable-line react-hooks/set-state-in-effect

    const handler = setTimeout(() => {
      setHasInitiatedNavigation(true);
      setSearchParams(
        (prevSearchParams: URLSearchParams) => {
          const newSearchParams = new URLSearchParams(
            prevSearchParams.toString(),
          );

          if (searchValue) {
            newSearchParams.set(searchValueKey, searchValue);
          } else {
            newSearchParams.delete(searchValueKey);
          }

          newSearchParams.set(currentPageKey, "1");
          setCurrentPageState(1);

          return newSearchParams;
        },
        { replace: true },
      );
    }, DEBOUNCE_TIME);

    return () => {
      clearTimeout(handler);
    };
  }, [
    searchValue,
    defaultQueryParams.searchValue,
    searchParams,
    setSearchParams,
    searchValueKey,
    currentPageKey,
  ]);

  useEffect(() => {
    if (navigation.state === "idle") {
      setIsPending(false); // eslint-disable-line react-hooks/set-state-in-effect
      setHasInitiatedNavigation(false);
    }
  }, [navigation.state]);

  const isSyncing =
    isPending || (hasInitiatedNavigation && navigation.state === "loading");

  const updateUrlParam = <T extends string | number>(
    key: string,
    value: T,
    setStateFunction: React.Dispatch<React.SetStateAction<T>>,
  ) => {
    setStateFunction(value);
    setHasInitiatedNavigation(true);
    setSearchParams(
      (prevSearchParams: URLSearchParams) => {
        const newSearchParams = new URLSearchParams(
          prevSearchParams.toString(),
        );

        if (value === "" || value === null || value === undefined) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }

        if (key !== currentPageKey) {
          newSearchParams.set(currentPageKey, "1");
          setCurrentPageState(1);
        }

        return newSearchParams;
      },
      { replace: true },
    );
  };

  const updateUrlParamObject = (
    key: string,
    value: FiltersValues,
    setStateFunction: React.Dispatch<React.SetStateAction<FiltersValues>>,
  ) => {
    setStateFunction(value);
    setHasInitiatedNavigation(true);
    setSearchParams(
      (prevSearchParams: URLSearchParams) => {
        const newSearchParams = buildFilterSearchParams(
          prevSearchParams,
          value,
          prefix,
        );

        if (key !== currentPageKey) {
          newSearchParams.set(currentPageKey, "1");
          setCurrentPageState(1);
        }

        return newSearchParams;
      },
      { replace: true },
    );
  };

  return {
    searchValue,
    setSearchValue: setSearchValueState,
    currentPage,
    setCurrentPage: (value: number) =>
      updateUrlParam<number>(currentPageKey, value, setCurrentPageState),
    sortValue,
    setSortValue: (value: string) =>
      updateUrlParam<string>(sortKey, value, setSortValueState),
    filtersValues,
    setFiltersValues: (value: FiltersValues) =>
      updateUrlParamObject(
        "filters",
        coerceClearedArrayFilters(value, arrayFilterKeys),
        setFiltersValuesState,
      ),
    isSyncing,
  };
}
