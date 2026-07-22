import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import map from "lodash/map";
import {
  Activity,
  FileText,
  Folder,
  Gauge,
  Layers,
  MessagesSquare,
} from "lucide-react";
import React from "react";
import { Link } from "react-router";
import type { Breadcrumb as BreadcrumbType } from "../app.types";

const BREADCRUMB_ICONS: Record<string, React.ReactNode> = {
  Projects: <Folder className="h-4 w-4" />,
  Files: <FileText className="h-4 w-4" />,
  Sessions: <MessagesSquare className="h-4 w-4" />,
  Runs: <Activity className="h-4 w-4" />,
  "Run Sets": <Layers className="h-4 w-4" />,
  Evaluations: <Gauge className="h-4 w-4" />,
};

function BreadcrumbElement({ breadcrumb }: { breadcrumb: BreadcrumbType }) {
  const icon = BREADCRUMB_ICONS[breadcrumb.text];
  const content = (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="inline-block max-w-48 truncate align-bottom md:max-w-96">
        {breadcrumb.text}
      </span>
    </span>
  );

  if (breadcrumb.link) {
    return (
      <BreadcrumbLink asChild>
        <Link
          to={breadcrumb.link}
          className="text-title font-normal tracking-tight text-balance"
        >
          {content}
        </Link>
      </BreadcrumbLink>
    );
  }
  return (
    <BreadcrumbPage className="text-primary text-title font-extrabold tracking-tight text-balance">
      {content}
    </BreadcrumbPage>
  );
}

export default function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: BreadcrumbType[];
}) {
  const hasCollapsedItems = breadcrumbs.length > 3;
  const collapsedItems = hasCollapsedItems ? breadcrumbs.slice(0, -3) : [];
  const visibleItems = hasCollapsedItems ? breadcrumbs.slice(-3) : breadcrumbs;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {hasCollapsedItems && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {map(collapsedItems, (breadcrumb, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link to={breadcrumb.link || "#"}>
                        {BREADCRUMB_ICONS[breadcrumb.text]}
                        {breadcrumb.text}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {map(visibleItems, (breadcrumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              <BreadcrumbElement breadcrumb={breadcrumb} />
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
