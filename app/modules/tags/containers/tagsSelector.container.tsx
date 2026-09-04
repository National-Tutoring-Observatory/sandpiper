import type { SelectActionComponentProps } from "@/components/ui/selectAll";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import TagsSelector from "../components/tagsSelector";

const TagsSelectorContainer = ({
  value,
  onChange,
}: SelectActionComponentProps) => {
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load(`/api/tags`);
  }, []);

  const toggleTag = (tagId: string) => {
    onChange(tagId);
  };

  const fetcherData = fetcher.data;

  let isLoading = true;

  if (fetcherData) {
    isLoading = false;
  }

  return (
    <TagsSelector
      tags={fetcherData?.tags.data}
      isLoading={isLoading}
      selectedTagIds={value}
      toggleTag={toggleTag}
    />
  );
};

export default TagsSelectorContainer;
