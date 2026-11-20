import each from "lodash/each";
import some from "lodash/some";
import type { AnnotationFilter, Utterance } from "../sessions.types";

export default ({
  transcript,
  annotationFilters,
  previousContextCount,
  nextContextCount,
}: {
  transcript: Utterance[];
  annotationFilters: AnnotationFilter[];
  previousContextCount: number;
  nextContextCount: number;
}) => {
  each(transcript, (utterance) => {
    utterance.isFiltered = false;
    utterance.isNeighbourFiltered = false;
    utterance.isFirstNeighbourFiltered = false;
    utterance.isLastNeighbourFiltered = false;
  });
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
  const isVisible = (utterance?: Utterance) =>
    !!utterance && (utterance.isFiltered || utterance.isNeighbourFiltered);
  let hasSetFirstNeighbour = false;
  each(transcript, (utterance, index) => {
    if (
      isVisible(utterance) &&
      transcript[index - 1] &&
      !isVisible(transcript[index - 1])
    ) {
      if (!hasSetFirstNeighbour) {
        hasSetFirstNeighbour = true;
        utterance.isFirstNeighbourFiltered = true;
      }
    }
    if (
      isVisible(utterance) &&
      transcript[index + 1] &&
      !isVisible(transcript[index + 1])
    ) {
      utterance.isLastNeighbourFiltered = true;
    }
  });
};
