import filter from "lodash/filter";
import find from "lodash/find";
import { useState } from "react";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import RunSessionAnnotationFilter from "../components/runSessionAnnotationFilter";
import type {
  AnnotationFilter,
  AnnotationFilterSettings,
} from "../sessions.types";

const RunSessionAnnotationFilterContainer = ({
  annotationFilters,
  annotationFilterSettings,
  annotationSchema,
  onAddAnnotationFilter,
  onRemoveAnnotationFilter,
  onAnnotationFilterSettingsChanged,
}: {
  annotationFilters: AnnotationFilter[];
  annotationFilterSettings: AnnotationFilterSettings;
  annotationSchema: AnnotationSchemaItem[];
  onAddAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
  onRemoveAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
  onAnnotationFilterSettingsChanged: (
    annotationFilterSettings: AnnotationFilterSettings,
  ) => void;
}) => {
  const availableFilters = filter(
    annotationSchema,
    (annotationSchemaItem) => !annotationSchemaItem.isSystem,
  );

  const [selectedFilterKey, setSelectedFilterKey] = useState<string>();
  const [selectedFilterValue, setSelectedFilterValue] = useState<
    string | number
  >();

  const onSelectedFilterKeyChanged = (selectedFilterKey: string) => {
    setSelectedFilterKey(selectedFilterKey);
  };

  const onSelectedFilterValueChanged = (
    selectedFilterValue: string | number,
  ) => {
    setSelectedFilterValue(selectedFilterValue);
  };

  const onAddFilterClicked = () => {
    setSelectedFilterKey("");
    setSelectedFilterValue("");
    const currentAnnotationSchemaItem = find(annotationSchema, {
      fieldKey: selectedFilterKey,
    });
    if (
      !selectedFilterKey ||
      selectedFilterValue === undefined ||
      selectedFilterValue === ""
    ) {
      return;
    }
    if (currentAnnotationSchemaItem?.fieldType === "boolean") {
      onAddAnnotationFilter({
        fieldKey: currentAnnotationSchemaItem.fieldKey,
        value: selectedFilterValue === "true" ? true : false,
      });
    } else {
      onAddAnnotationFilter({
        fieldKey: selectedFilterKey,
        value: selectedFilterValue,
      });
    }
  };

  return (
    <RunSessionAnnotationFilter
      annotationFilters={annotationFilters}
      annotationFilterSettings={annotationFilterSettings}
      availableFilters={availableFilters}
      selectedFilterKey={selectedFilterKey}
      selectedFilterValue={selectedFilterValue}
      onSelectedFilterKeyChanged={onSelectedFilterKeyChanged}
      onSelectedFilterValueChanged={onSelectedFilterValueChanged}
      onAddFilterClicked={onAddFilterClicked}
      onRemoveFilterClicked={onRemoveAnnotationFilter}
      onAnnotationFilterSettingsChanged={onAnnotationFilterSettingsChanged}
    />
  );
};

export default RunSessionAnnotationFilterContainer;
