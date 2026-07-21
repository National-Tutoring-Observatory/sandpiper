import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  STATUS_META,
  getRunSessionStatusKey,
} from "~/modules/runs/helpers/statusMeta";
import type { RunSession } from "~/modules/runs/runs.types";

export default function SessionListSidebar({
  sessions,
  totalPages,
  count,
  currentSessionId,
  runLink,
  search,
  searchValue,
  currentPage,
  isSyncing,
  onSearchValueChanged,
  onPaginationChanged,
}: {
  sessions: RunSession[];
  totalPages: number;
  count: number;
  currentSessionId: string;
  runLink: string;
  search: string;
  searchValue: string;
  currentPage: number;
  isSyncing: boolean;
  onSearchValueChanged: (value: string) => void;
  onPaginationChanged: (value: number) => void;
}) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, []);

  return (
    <div className="flex h-full w-[clamp(9rem,14vw,15rem)] shrink-0 flex-col border-r">
      <div className="border-b p-3">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search sessions..."
            value={searchValue}
            className="pl-9 shadow-none"
            onChange={(e) => onSearchValueChanged(e.target.value)}
          />
        </div>
        <div className="text-muted-foreground text-caption mt-2 flex items-center gap-1.5">
          <span>
            {count} session{count !== 1 ? "s" : ""}
          </span>
          {isSyncing && <Spinner className="size-3" />}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => {
          const isCurrent = session.sessionId === currentSessionId;
          const isDone = session.status === "DONE";
          const statusMeta =
            STATUS_META[getRunSessionStatusKey(session.status)];

          const content = (
            <div className="py-1">
              <div className="text-body truncate font-medium">
                {session.name}
              </div>
              <div className="text-muted-foreground text-caption mt-0.5 flex items-center gap-1">
                <span className="flex items-center gap-1 [&_svg]:size-3">
                  {statusMeta.icon}
                </span>
                <span>{statusMeta.text}</span>
              </div>
            </div>
          );

          if (!isDone) {
            return (
              <div
                key={session.sessionId}
                className="cursor-default border-b px-3 py-2 opacity-50"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={session.sessionId}
              ref={isCurrent ? activeRef : undefined}
              to={{
                pathname: `${runLink}/sessions/${session.sessionId}`,
                search,
              }}
              className={clsx("block border-b px-3 py-2", {
                "bg-accent": isCurrent,
                "hover:bg-muted": !isCurrent,
              })}
            >
              {content}
            </Link>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPaginationChanged(currentPage - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground text-caption">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => onPaginationChanged(currentPage + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
