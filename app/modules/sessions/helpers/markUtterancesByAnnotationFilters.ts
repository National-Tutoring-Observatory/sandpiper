import each from "lodash/each";
import some from "lodash/some";
import type { AnnotationFilter, Utterance } from "../sessions.types";

export default ({
  transcript,
  annotationFilters,
  previousContextCount = 5,
  nextContextCount = 5,
}: {
  transcript: Utterance[];
  annotationFilters: AnnotationFilter[];
  previousContextCount: number;
  nextContextCount: number;
}) => {
  each(transcript, (utterance, index) => {
    const isFiltered = some(utterance.annotations, (annotation) =>
      some(
        annotationFilters,
        (filter) => annotation[filter.fieldKey] === filter.value,
      ),
    );
    if (isFiltered) {
      for (let offset = 1; offset <= previousContextCount; offset++) {
        if (transcript[index - offset]) {
          transcript[index - offset].isNeighbourFiltered = true;
        }
      }
      for (let offset = 1; offset <= nextContextCount; offset++) {
        if (transcript[index + offset]) {
          transcript[index + offset].isNeighbourFiltered = true;
        }
      }
    }
    utterance.isFiltered = isFiltered;
  });
  let hasSetFirstNeighbour = false;
  each(transcript, (utterance, index) => {
    if (
      utterance.isNeighbourFiltered &&
      transcript[index - 1] &&
      !transcript[index - 1].isNeighbourFiltered
    ) {
      if (!hasSetFirstNeighbour) {
        hasSetFirstNeighbour = true;
        utterance.isFirstNeighbourFiltered = true;
      }
    }
    if (
      utterance.isNeighbourFiltered &&
      transcript[index + 1] &&
      !transcript[index + 1].isNeighbourFiltered &&
      !transcript[index + 1].isFiltered
    ) {
      utterance.isLastNeighbourFiltered = true;
    }
  });
};
