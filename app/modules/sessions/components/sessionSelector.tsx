import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import includes from "lodash/includes";
import map from "lodash/map";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
} from "lucide-react";
import getDateString from "~/modules/app/helpers/getDateString";
import type { Session } from "../sessions.types";
import SessionRandomizer from "./sessionRandomizer";

export type SessionSortField = "name" | "createdAt";
export type SortDirection = "asc" | "desc";

function ColumnSortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SessionSortField;
  sortField: SessionSortField;
  sortDirection: SortDirection;
}) {
  const Icon =
    sortDirection === "asc" ? ArrowUpWideNarrow : ArrowDownWideNarrow;
  return sortField === field ? (
    <Icon className="h-4 w-4" />
  ) : (
    <ArrowUpDown className="text-muted-foreground/30 h-4 w-4" />
  );
}

export default function SessionSelector({
  sessions = [],
  selectedSessions,
  sampleSize,
  sortField,
  sortDirection,
  onSortChanged,
  onSelectAllToggled,
  onSelectSessionToggled,
  onSampleSizeChanged,
  onRandomizeClicked,
}: {
  sessions: Session[];
  selectedSessions: string[];
  sampleSize: number;
  sortField: SessionSortField;
  sortDirection: SortDirection;
  onSortChanged: (field: SessionSortField) => void;
  onSelectAllToggled: (isChecked: boolean) => void;
  onSelectSessionToggled: ({
    sessionId,
    isChecked,
  }: {
    sessionId: string;
    isChecked: boolean;
  }) => void;
  onSampleSizeChanged: (size: number) => void;
  onRandomizeClicked: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Select All</span>
        <span className="text-muted-foreground text-sm">
          <strong className="text-foreground">{selectedSessions.length}</strong>
          &nbsp;session(s) selected
        </span>
        <SessionRandomizer
          sampleSize={sampleSize}
          maxSize={sessions.length}
          onSampleSizeChanged={onSampleSizeChanged}
          onRandomizeClicked={onRandomizeClicked}
        />
      </div>
      <div className="h-80 overflow-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={selectedSessions.length === sessions.length}
                  onCheckedChange={(checked) =>
                    onSelectAllToggled(Boolean(checked))
                  }
                />
              </TableHead>
              <TableHead className="w-[300px]">
                <button
                  onClick={() => onSortChanged("name")}
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
                >
                  Name
                  <ColumnSortIcon
                    field="name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => onSortChanged("createdAt")}
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
                >
                  Created
                  <ColumnSortIcon
                    field="createdAt"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>File type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {map(sessions, (session: Session) => {
              return (
                <TableRow key={session._id}>
                  <TableCell className="w-8">
                    <Checkbox
                      checked={includes(selectedSessions, session._id)}
                      onCheckedChange={(checked) =>
                        onSelectSessionToggled({
                          sessionId: session._id,
                          isChecked: Boolean(checked),
                        })
                      }
                    ></Checkbox>
                  </TableCell>
                  <TableCell className="font-medium">{session.name}</TableCell>
                  <TableCell>{getDateString(session.createdAt)}</TableCell>
                  <TableCell>{session.fileType}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
