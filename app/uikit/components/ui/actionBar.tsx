import clsx from "clsx";
import map from "lodash/map";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button } from "./button";
import Filters, { type Filter, type FiltersProps } from "./filters";
import { Pagination, type PaginationProps } from "./pagination";
import { Search, type SearchProps } from "./search";
import SelectActions from "./selectActions";
import SelectAll, { type SelectProps } from "./selectAll";
import type { SortOption, SortProps } from "./sort";
import Sort from "./sort";
import { Spinner } from "./spinner";

export type Action = {
  icon?: ReactElement;
  action: string;
  text: string;
  variant?: "default" | "destructive" | undefined;
};

export type ActionBarProps = {
  actions?: Action[];
  filters?: Filter[];
  sortOptions?: SortOption[];
  hasSearch?: boolean;
  hasPagination?: boolean;
  isSyncing?: boolean;
  onActionClicked: (action: string) => void;
};

function ActionBar({
  actions,
  selectActions,
  selectedItems = [],
  selectActionsValues = {},
  totalItems,
  filters,
  filtersValues,
  sortOptions,
  sortValue,
  searchValue,
  hasSearch = false,
  hasPagination = false,
  isSyncing = false,
  currentPage = 1,
  totalPages = 1,
  onActionClicked,
  onSelectAllChanged,
  onSelectActionChanged,
  onSelectActionClosed,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: ActionBarProps &
  SelectProps &
  SearchProps &
  PaginationProps &
  FiltersProps &
  SortProps) {
  // Don't render if there's no content to display
  const hasContent =
    hasSearch ||
    hasPagination ||
    isSyncing ||
    (actions && actions.length > 0) ||
    (filters && filters.length > 0) ||
    (sortOptions && sortOptions.length > 0);

  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!hasContent) {
    return null;
  }

  const isSelectMode = selectedItems.length > 0;

  return (
    <>
      <div ref={sentinelRef} aria-hidden style={{ height: "1px" }} />

      <div
        className={clsx(
          `bg-background sticky top-4 z-10 mb-2 flex justify-between rounded-2xl border p-2 transition-all`,
          {
            "-mx-2 shadow": isStuck,
          },
        )}
      >
        <div className="flex w-1/3 items-center gap-x-1">
          {selectActions && selectActions.length > 0 && (
            <SelectAll
              selectedItems={selectedItems}
              totalItems={totalItems}
              onSelectAllChanged={onSelectAllChanged}
            />
          )}
          {hasSearch && (
            <Search
              searchValue={searchValue}
              onSearchValueChanged={onSearchValueChanged}
            />
          )}
          {filters && filters.length > 0 && (
            <Filters
              filters={filters}
              filtersValues={filtersValues}
              onFiltersValueChanged={onFiltersValueChanged}
            />
          )}
          {sortOptions && sortOptions.length > 0 && (
            <Sort
              sortOptions={sortOptions}
              sortValue={sortValue}
              onSortValueChanged={onSortValueChanged}
            />
          )}
        </div>
        <div className="flex w-1/3 items-center justify-center">
          {hasPagination && !isSelectMode && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPaginationChanged={onPaginationChanged}
            />
          )}
          {isSelectMode && (
            <div className="text-sm">{`${selectedItems.length} of ${totalItems} selected`}</div>
          )}
        </div>
        <div className="flex w-1/3 justify-end gap-x-1">
          {!isSelectMode &&
            map(actions, (action) => {
              return (
                <Button
                  key={action.action}
                  onClick={() => onActionClicked(action.action)}
                >
                  {action.icon ? action.icon : null}
                  {action.text}
                </Button>
              );
            })}
          {isSelectMode && selectActions && selectActions.length > 0 && (
            <SelectActions
              selectActionsValues={selectActionsValues}
              actions={selectActions}
              onSelectActionChanged={onSelectActionChanged}
              onSelectActionClosed={onSelectActionClosed}
            />
          )}
        </div>
        {isSyncing && (
          <div
            className={clsx(
              "bg-background absolute top-full left-1/2 -translate-x-1/2 rounded-b-md border-x border-b px-6 pb-1",
              {
                shadow: isStuck,
              },
            )}
          >
            <div className="flex items-center gap-x-2 text-xs">
              <Spinner className="size-3" /> Syncing
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export { ActionBar };
