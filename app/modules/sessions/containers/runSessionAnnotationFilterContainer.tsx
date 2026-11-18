import filter from "lodash/filter";
import find from "lodash/find";
import { useState } from "react";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import RunSessionAnnotationFilter from "../components/runSessionAnnotationFilter";
import type { AnnotationFilter } from "../sessions.types";

const RunSessionAnnotationFilterContainer = ({
  annotationFilters,
  annotationSchema,
  onAddAnnotationFilter,
  onRemoveAnnotationFilter,
}: {
  annotationFilters: AnnotationFilter[];
  annotationSchema: AnnotationSchemaItem[];
  onAddAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
  onRemoveAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
}) => {
  const availableFilters = filter(
    annotationSchema,
    (annotationSchemaItem) => !annotationSchemaItem.isSystem,
  );

  const [selectedFilterKey, setSelectedFilterKey] = useState<string>();
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>();

  const onSelectedFilterKeyChanged = (selectedFilterKey: string) => {
    setSelectedFilterKey(selectedFilterKey);
  };

  const onSelectedFilterValueChanged = (selectedFilterValue: string) => {
    setSelectedFilterValue(selectedFilterValue);
  };

  const onAddFilterClicked = () => {
    setSelectedFilterKey("");
    setSelectedFilterValue("");
    const currentAnnotationSchemaItem = find(annotationSchema, {
      fieldKey: selectedFilterKey,
    });
    if (currentAnnotationSchemaItem?.fieldType === "boolean") {
      onAddAnnotationFilter({
        fieldKey: currentAnnotationSchemaItem.fieldKey,
        value: selectedFilterValue === "true" ? true : false,
      });
    }
  };

  return (
    <RunSessionAnnotationFilter
      annotationFilters={annotationFilters}
      availableFilters={availableFilters}
      selectedFilterKey={selectedFilterKey}
      selectedFilterValue={selectedFilterValue}
      onSelectedFilterKeyChanged={onSelectedFilterKeyChanged}
      onSelectedFilterValueChanged={onSelectedFilterValueChanged}
      onAddFilterClicked={onAddFilterClicked}
      onRemoveFilterClicked={onRemoveAnnotationFilter}
    />
  );
};

export default RunSessionAnnotationFilterContainer;
