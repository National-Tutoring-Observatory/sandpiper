import { Notebook } from "lucide-react";

export default function getTeamCodebooksEmptyAttributes() {
  return {
    icon: <Notebook />,
    title: "No Codebooks yet",
    description: "No codebooks are associated with this team",
    actions: [],
  };
}
