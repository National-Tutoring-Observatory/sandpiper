import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import addDialog from "~/modules/dialogs/addDialog";
import EditTagDialog from "../components/editTagDialog";
import TagsSelector from "../components/tagsSelector";
import type { Tag } from "../tags.types";

const TagsSelectorContainer = ({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tagId: string) => void;
}) => {
  const fetcher = useFetcher();
  const createTagFetcher = useFetcher();

  useEffect(() => {
    fetcher.load(`/api/tags`);
  }, []);

  useEffect(() => {
    if (createTagFetcher.state !== "idle") return;
    const createData = createTagFetcher.data;
    if (!createData) return;
    if (createData.errors) {
      toast.error(createData.errors.general || "Could not create tag");
      return;
    }
    if (!createData.success || createData.intent !== "CREATE_TAG") return;
    fetcher.load(`/api/tags`);
    onChange(createData.tag._id);
  }, [createTagFetcher.state, createTagFetcher.data]);

  const toggleTag = (tagId: string) => {
    onChange(tagId);
  };

  const submitCreateTag = (
    tag: Pick<Tag, "name" | "description" | "color">,
  ) => {
    createTagFetcher.submit(
      JSON.stringify({ intent: "CREATE_TAG", data: tag }),
      {
        method: "POST",
        action: "/api/tags",
        encType: "application/json",
      },
    );
  };

  const handleCreateNewTagClicked = () => {
    addDialog(
      <EditTagDialog
        tag={{ name: "", description: "", color: "#454545" }}
        onEditTagClicked={submitCreateTag}
      />,
    );
  };

  const fetcherData = fetcher.data;

  let isLoading = true;

  if (fetcherData) {
    isLoading = false;
  }
  return (
    <TagsSelector
      tags={fetcherData?.tags.data}
      selectedTags={selectedTags}
      isLoading={isLoading}
      onChange={toggleTag}
      onCreateNewTagClicked={handleCreateNewTagClicked}
    />
  );
};

export default TagsSelectorContainer;
