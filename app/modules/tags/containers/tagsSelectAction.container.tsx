import type { SelectActionComponentProps } from "@/components/ui/selectAll";
import TagsSelectorContainer from "./tagsSelector.container";

const TagsSelectActionContainer = (props: SelectActionComponentProps) => {
  return <TagsSelectorContainer {...props} label="Add tags to sessions" />;
};

export default TagsSelectActionContainer;
