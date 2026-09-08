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

function parseFiltersFromUrl(
  searchParams: URLSearchParams,
  defaultFilters?: FiltersValues | null,
  prefix: string = "",
): FiltersValues {
  const filterPrefix = prefix ? `${prefix}Filter_` : "filter_";

  // Filters can be an array or string value
  const filters: FiltersValues = {};
  const arrayFilterKeys = new Set<string>();
  if (defaultFilters) {
    for (const [key, defaultValue] of Object.entries(defaultFilters)) {
      if (Array.isArray(defaultValue)) {
        arrayFilterKeys.add(key);
        filters[key] = [];
      }
    }
  }

  const seenKeys = new Set<string>();
  searchParams.forEach((_, key) => {
    if (!key.startsWith(filterPrefix) || seenKeys.has(key)) return;
    seenKeys.add(key);

    const filterKey = key.replace(filterPrefix, "");
    const values = searchParams.getAll(key);
    filters[filterKey] = arrayFilterKeys.has(filterKey) ? values : values[0];
  });

  return Object.keys(filters).length > 0 ? filters : (defaultFilters ?? {});
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
        const newSearchParams = new URLSearchParams(
          prevSearchParams.toString(),
        );

        const filterPrefix = prefix ? `${prefix}Filter_` : "filter_";

        // Remove all existing filter_* params
        const keysToDelete: string[] = [];
        newSearchParams.forEach((_, paramKey) => {
          if (paramKey.startsWith(filterPrefix)) {
            keysToDelete.push(paramKey);
          }
        });
        keysToDelete.forEach((k) => newSearchParams.delete(k));

        // Add new filter params (array values become repeated params)
        if (value && Object.keys(value).length > 0) {
          Object.entries(value).forEach(([filterKey, filterValue]) => {
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
    setFiltersValues: (value: FiltersValues) => {
      const normalised: FiltersValues = { ...value };
      for (const key of arrayFilterKeys) {
        if (normalised[key] === null || normalised[key] === undefined) {
          normalised[key] = [];
        }
      }
      updateUrlParamObject("filters", normalised, setFiltersValuesState);
    },
    isSyncing,
  };
}
