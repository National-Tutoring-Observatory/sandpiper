import clsx from "clsx";
import map from "lodash/map";
import { type ReactElement } from "react";
import { Link } from "react-router";
import { ActionBar, type Action } from "./actionBar";
import { CollectionEmpty } from "./collectionEmpty";
import type { CollectionItemAction } from "./collectionItemActions";
import CollectionItemActions from "./collectionItemActions";
import type { CollectionItemAttributes } from "./collectionItemContent";
import CollectionItemContent from "./collectionItemContent";
import type { FiltersProps } from "./filters";
import { Item, ItemGroup, ItemSeparator } from "./item";
import type { PaginationProps } from "./pagination";
import type { SearchProps } from "./search";
import type { SelectProps } from "./selectAll";
import SelectItem from "./selectItem";
import type { SortProps } from "./sort";

export type CollectionProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  itemsLayout: "list" | "card";
  actions?: Action[];
  hasSearch?: boolean;
  hasPagination?: boolean;
  isSyncing?: boolean;
  emptyAttributes: {
    title?: string;
    description?: string;
    icon?: ReactElement;
    actions?: Action[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderItem?: (item: any) => ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItemAttributes: (item: any) => CollectionItemAttributes;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItemActions: (item: any) => CollectionItemAction[];
  onItemClicked?: (id: string) => void;
  onActionClicked: (action: string) => void;
  onItemActionClicked?: ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => void;
};

const Collection = ({
  items,
  itemsLayout = "list",
  actions = [],
  selectActions = [],
  selectedItems = [],
  filters = [],
  filtersValues,
  sortOptions,
  sortValue,
  searchValue,
  hasSearch,
  hasPagination,
  isSyncing,
  currentPage,
  totalPages,
  emptyAttributes = {},
  renderItem,
  getItemAttributes,
  getItemActions,
  onItemClicked,
  onActionClicked,
  onSelectChanged,
  onItemActionClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: CollectionProps &
  SelectProps &
  SearchProps &
  PaginationProps &
  FiltersProps &
  SortProps) => {
  const onSelectAllChanged = () => {
    if (onSelectChanged) {
      if (selectedItems.length > 0) {
        onSelectChanged([]);
      } else {
        onSelectChanged(
          map(items, (item) => {
            const { id } = getItemAttributes(item);
            return id;
          }),
        );
      }
    } else {
      console.warn(
        "Collection is trying to select all but onSelectChanged is missing",
      );
    }
  };

  const onSelectItemChanged = (itemId: string) => {
    if (!onSelectChanged) {
      console.warn(
        "Collection is trying to select an item but onSelectChanged is missing",
      );
      return;
    }
    if (selectedItems.includes(itemId)) {
      onSelectChanged(selectedItems.filter((id) => id !== itemId));
    } else {
      onSelectChanged([...selectedItems, itemId]);
    }
  };

  return (
    <div>
      <ActionBar
        actions={actions}
        selectActions={selectActions}
        selectedItems={selectedItems}
        totalItems={items.length}
        filters={filters}
        filtersValues={filtersValues}
        sortOptions={sortOptions}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        hasSearch={hasSearch}
        hasPagination={hasPagination}
        isSyncing={isSyncing}
        onActionClicked={onActionClicked}
        onSelectAllChanged={onSelectAllChanged}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
      {items.length === 0 && !isSyncing && (
        <CollectionEmpty
          searchValue={searchValue}
          filtersValues={filtersValues}
          emptyAttributes={emptyAttributes}
          onActionClicked={onActionClicked}
        />
      )}
      <ItemGroup
        className={clsx({
          "rounded-sm border": itemsLayout === "list",
          "grid grid-cols-3 gap-4": itemsLayout === "card",
        })}
      >
        {map(items, (item, index) => {
          if (!getItemAttributes) {
            console.warn("getItemAttribtues must be defined on the Collection");
            return null;
          }

          const { id, title, description, to, meta, isDisabled } =
            getItemAttributes(item);

          const itemActions = getItemActions(item);

          return (
            <div key={id}>
              <Item
                variant={itemsLayout === "card" ? "outline" : undefined}
                className={clsx(
                  { "opacity-50": isDisabled },
                  {
                    "hover:bg-accent/50 cursor-pointer":
                      !isDisabled && (onItemClicked || to),
                  },
                  "has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative rounded-none p-0 transition-colors duration-300 has-focus-visible:ring-[3px]",
                )}
              >
                <div className="flex items-center">
                  {selectActions && selectActions.length > 0 && (
                    <SelectItem
                      isSelected={selectedItems.includes(id)}
                      onSelectItemChanged={() => onSelectItemChanged(id)}
                    />
                  )}
                  {to && !isDisabled ? (
                    <Link
                      to={to}
                      className={clsx(
                        {
                          "pr-[140px]": itemActions.length > 0,
                        },
                        "flex w-full min-w-0 items-center gap-4 rounded-none p-4 outline-none",
                      )}
                    >
                      {(renderItem && renderItem(item)) || (
                        <CollectionItemContent
                          title={title}
                          description={description}
                          meta={meta}
                        />
                      )}
                    </Link>
                  ) : (
                    <div
                      className={clsx(
                        {
                          "pr-[140px]": itemActions.length > 0,
                        },
                        "flex w-full min-w-0 items-center gap-4 rounded-none p-4",
                      )}
                      onClick={() => {
                        if (onItemClicked) {
                          onItemClicked(item._id);
                        }
                      }}
                    >
                      {(renderItem && renderItem(item)) || (
                        <CollectionItemContent
                          title={title}
                          description={description}
                          meta={meta}
                        />
                      )}
                    </div>
                  )}
                  {!renderItem && (
                    <CollectionItemActions
                      id={id}
                      actions={itemActions}
                      isDisabled={!!isDisabled}
                      to={to}
                      onItemActionClicked={onItemActionClicked}
                    />
                  )}
                </div>
              </Item>
              {index !== items.length - 1 && itemsLayout === "list" && (
                <ItemSeparator />
              )}
            </div>
          );
        })}
      </ItemGroup>
    </div>
  );
};

export { Collection };
