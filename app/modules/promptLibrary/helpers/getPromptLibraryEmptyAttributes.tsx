import { Library } from "lucide-react";

export default function getPromptLibraryEmptyAttributes() {
  return {
    icon: <Library />,
    title: "No prompts in the library yet",
    description:
      "Once curators publish prompts, they'll show up here for everyone to browse and copy.",
    actions: [],
  };
}
