import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import SupportArticlesContainer from "~/modules/support/containers/supportArticles.container";

export default function SideBarHelpDropdown() {
  const [docsOpen, setDocsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="sm" className="cursor-pointer">
            <CircleHelp />
            <span>Help & Support</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={"right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuItem onClick={() => setDocsOpen(true)}>
            Read the Documentation
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/orgs/National-Tutoring-Observatory/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask a Question
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/National-Tutoring-Observatory/sandpiper/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report a Bug or Request a Feature
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/National-Tutoring-Observatory/sandpiper/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Existing Issues
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Terms of Use & Privacy Policy
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={docsOpen} onOpenChange={setDocsOpen}>
        <SheetContent side="left" className="overflow-y-auto">
          <SupportArticlesContainer />
        </SheetContent>
      </Sheet>
    </>
  );
}
