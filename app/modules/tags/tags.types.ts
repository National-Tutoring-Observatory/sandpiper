import type { Breadcrumb } from "~/modules/app/app.types";

export interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  team: string;
  createdAt: Date | string;
  createdBy?: string;
  updatedAt: Date | string;
  updatedBy?: string;
}

export interface CreateTagProps {
  name: string;
  description: string;
  color: string;
  team: string;
  createdBy: string;
}

export interface TagsProps {
  breadcrumbs: Breadcrumb[];
  tags: Tag[];
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onItemActionClicked: ({ id, action }: { id: string; action: string }) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onFiltersValueChanged: (filterValue: Record<string, string | null>) => void;
  onSortValueChanged: (sortValue: string) => void;
}
