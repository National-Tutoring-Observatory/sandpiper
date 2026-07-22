export default function EvaluationSummary({
  selectedRunsCount,
  selectedAnnotationFieldsCount,
}: {
  selectedRunsCount: number;
  selectedAnnotationFieldsCount: number;
}) {
  return (
    <div className="border-sandpiper-info/20 bg-sandpiper-info/5 rounded-lg border px-4 py-3">
      <p className="text-foreground text-body">
        This evaluation will compare <strong>{selectedRunsCount + 1}</strong>{" "}
        run(s) — 1 base run + {selectedRunsCount} comparison run(s) over{" "}
        <strong>{selectedAnnotationFieldsCount}</strong> annotation field(s).
      </p>
    </div>
  );
}
