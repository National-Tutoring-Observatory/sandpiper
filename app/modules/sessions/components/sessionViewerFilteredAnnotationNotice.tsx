import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

export default function SessionViewerFilteredAnnotationNotice({
  label,
  onRemoveFiltersClicked,
}: {
  label: string;
  onRemoveFiltersClicked: () => void;
}) {
  return (
    <div className="primary relative mb-4 flex justify-center">
      <div
        className="bg-primary absolute top-3 h-2 w-full"
        style={{
          maskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M0 4 Q3 0 6 4 T12 4' fill='none' stroke='black' stroke-width='1.5'/></svg>")`,
          maskRepeat: "repeat-x",
        }}
      />
      <Button
        className="group bg-primary! relative z-10 w-56 rounded-full text-xs"
        onClick={onRemoveFiltersClicked}
      >
        <span className="group-hover:hidden">{label}</span>
        <span className="hidden w-full items-center justify-center gap-x-1 group-hover:flex">
          <XIcon />
          Remove filters
        </span>
      </Button>
    </div>
  );
}
