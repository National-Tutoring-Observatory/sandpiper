import cloneDeep from "lodash/cloneDeep";
import includes from "lodash/includes";
import orderBy from "lodash/orderBy";
import pull from "lodash/pull";
import sampleSize from "lodash/sampleSize";
import some from "lodash/some";
import { useEffect, useMemo, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type {
  SessionSortField,
  SortDirection,
} from "../components/sessionSelector";
import SessionSelector from "../components/sessionSelector";
import type { Session, SessionData } from "../sessions.types";

export default function SessionSelectorContainer({
  selectedSessions,
  onSelectedSessionsChanged,
}: {
  selectedSessions: string[];
  onSelectedSessionsChanged: (sessions: SessionData[]) => void;
}) {
  const sessionsFetcher = useFetcher({ key: "sessionsList" });
  const [userSampleSize, setUserSampleSize] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SessionSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const defaultSampleSize = sessionsFetcher.data?.sessions?.count
    ? Math.floor(sessionsFetcher.data.sessions.count / 3) || 1
    : 0;
  const randomSampleSize = userSampleSize ?? defaultSampleSize;

  const params = useParams();

  const sortedSessions = useMemo(() => {
    const sessions = sessionsFetcher.data?.sessions?.data;
    if (!sessions) return [];
    return orderBy(sessions, [sortField], [sortDirection]);
  }, [sessionsFetcher.data?.sessions?.data, sortField, sortDirection]);

  const toSessionData = (ids: string[]): SessionData[] => {
    const idSet = new Set(ids);
    return sortedSessions
      .filter((s) => idSet.has(s._id))
      .map((s) => ({ _id: s._id, inputTokens: s.inputTokens }));
  };

  const onSortChanged = (field: SessionSortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const onSelectAllToggled = (isChecked: boolean) => {
    if (isChecked) {
      onSelectedSessionsChanged(
        sortedSessions.map((s) => ({ _id: s._id, inputTokens: s.inputTokens })),
      );
    } else {
      onSelectedSessionsChanged([]);
    }
  };

  const onSelectSessionToggled = ({
    sessionId,
    isChecked,
  }: {
    sessionId: string;
    isChecked: boolean;
  }) => {
    const clonedIds = cloneDeep(selectedSessions);
    if (isChecked) {
      clonedIds.push(sessionId);
    } else {
      pull(clonedIds, sessionId);
    }
    onSelectedSessionsChanged(toSessionData(clonedIds));
  };

  const onSampleSizeChanged = (size: number) => {
    setUserSampleSize(size);
  };

  const onRandomizeClicked = () => {
    if (!sortedSessions.length) return;
    const randomSessions = sampleSize(sortedSessions, randomSampleSize);
    onSelectedSessionsChanged(
      randomSessions.map((s) => ({ _id: s._id, inputTokens: s.inputTokens })),
    );
  };

  const onSelectedTagsToggled = (selectedTag: string) => {
    const isRemoving = includes(selectedTags, selectedTag);
    const clonedTags = cloneDeep(selectedTags);
    if (isRemoving) {
      pull(clonedTags, selectedTag);
    } else {
      clonedTags.push(selectedTag);
    }
    setSelectedTags(clonedTags);

    const taggedSessionIds = sortedSessions
      .filter((s: Session) =>
        some(
          s.tags,
          (tag) => (typeof tag === "string" ? tag : tag._id) === selectedTag,
        ),
      )
      .map((s: Session) => s._id);

    const sessionIds = isRemoving
      ? selectedSessions.filter((id) => !includes(taggedSessionIds, id))
      : [...selectedSessions, ...taggedSessionIds];

    onSelectedSessionsChanged(toSessionData(sessionIds));
  };

  const onSelectTagsClosed = () => {
    setSelectedTags([]);
  };

  useEffect(() => {
    const queryParams = new URLSearchParams();
    queryParams.set("project", params.projectId || "");
    sessionsFetcher.load(`/api/sessionsList?${queryParams.toString()}`);
  }, []);

  useEffect(() => {
    if (!sessionsFetcher.data?.sessions?.data) return;
    if (selectedSessions.length > 0) {
      onSelectedSessionsChanged(toSessionData(selectedSessions));
    }
  }, [sessionsFetcher.data?.sessions?.data]);

  return (
    <SessionSelector
      sessions={sortedSessions}
      selectedSessions={selectedSessions}
      selectedTags={selectedTags}
      sampleSize={randomSampleSize}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChanged={onSortChanged}
      onSelectAllToggled={onSelectAllToggled}
      onSelectSessionToggled={onSelectSessionToggled}
      onSampleSizeChanged={onSampleSizeChanged}
      onRandomizeClicked={onRandomizeClicked}
      onSelectedTagsToggled={onSelectedTagsToggled}
      onSelectTagsClosed={onSelectTagsClosed}
    />
  );
}
