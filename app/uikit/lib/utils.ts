import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The semantic type scale (see documentation/typography.md) is defined as custom
// @utility classes. tailwind-merge doesn't recognize them, so it misclassifies
// e.g. `text-title` as a text-color and drops a real color like `text-primary`
// during a merge. Register them as font-size utilities so they conflict only
// with other sizes, never with colors.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-title",
        "text-heading",
        "text-body",
        "text-body-lg",
        "text-caption",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
