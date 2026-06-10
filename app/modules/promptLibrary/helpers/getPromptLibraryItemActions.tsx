import type { CollectionItemAction } from "@/components/ui/collectionItemActions";
import { Copy } from "lucide-react";

export default function getPromptLibraryItemActions(): CollectionItemAction[] {
  return [
    {
      action: "COPY",
      icon: <Copy />,
      text: "Copy to my team",
    },
  ];
}
