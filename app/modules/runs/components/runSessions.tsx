import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { Spinner } from "@/components/ui/spinner";
import { AnimatePresence, motion } from "motion/react";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type { Run, RunSession } from "~/modules/runs/runs.types";
import SessionListSidebar from "~/modules/sessions/components/sessionListSidebar";
import RunSessionViewerContainer from "~/modules/sessions/containers/runSessionViewerContainer";
import type { SessionFile } from "~/modules/sessions/sessions.types";

export default function RunSessions({
  run,
  sessionFile,
  session,
  breadcrumbs,
  runLink,
  currentSessionId,
  paginatedSessions,
  sidebarSearchValue,
  sidebarCurrentPage,
  sidebarIsSyncing,
  sidebarSearch,
  isLoadingSession,
  onSidebarSearchValueChanged,
  onSidebarPaginationChanged,
}: {
  run: Run;
  sessionFile: SessionFile;
  session: RunSession;
  breadcrumbs: Breadcrumb[];
  runLink: string;
  currentSessionId: string;
  paginatedSessions: { data: RunSession[]; count: number; totalPages: number };
  sidebarSearchValue: string;
  sidebarCurrentPage: number;
  sidebarIsSyncing: boolean;
  sidebarSearch: string;
  isLoadingSession: boolean;
  onSidebarSearchValueChanged: (value: string) => void;
  onSidebarPaginationChanged: (value: number) => void;
}) {
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <div className="flex h-[calc(100vh-140px)] rounded-md border">
        <SessionListSidebar
          sessions={paginatedSessions.data}
          totalPages={paginatedSessions.totalPages}
          count={paginatedSessions.count}
          currentSessionId={currentSessionId}
          runLink={runLink}
          search={sidebarSearch}
          searchValue={sidebarSearchValue}
          currentPage={sidebarCurrentPage}
          isSyncing={sidebarIsSyncing}
          onSearchValueChanged={onSidebarSearchValueChanged}
          onPaginationChanged={onSidebarPaginationChanged}
        />
        <div className="relative">
          <AnimatePresence>
            {isLoadingSession && (
              <motion.div
                key="session-loading"
                className="absolute top-0 left-0 z-40 flex h-full w-full flex-1 items-center justify-center bg-black/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Spinner className="size-6" />
              </motion.div>
            )}
          </AnimatePresence>
          <RunSessionViewerContainer
            run={run}
            session={session}
            sessionFile={sessionFile}
          />
        </div>
      </div>
    </div>
  );
}
