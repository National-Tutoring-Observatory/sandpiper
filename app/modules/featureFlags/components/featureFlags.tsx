import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { Separator } from "@/components/ui/separator";
import map from "lodash/map";
import { ChevronRight } from "lucide-react";
import React from "react";
import { Link, Outlet } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type { FeatureFlag } from "../featureFlags.types";
import { featureFlagsUrl } from "../helpers/featureFlagUrls";

export default function FeatureFlags({
  featureFlags,
  breadcrumbs,
  onCreateFeatureFlagButtonClicked,
}: {
  featureFlags: FeatureFlag[];
  breadcrumbs: Breadcrumb[];
  onCreateFeatureFlagButtonClicked: () => void;
}) {
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <div>
        <div className="flex justify-end p-2">
          <Button onClick={onCreateFeatureFlagButtonClicked}>
            Create feature flag
          </Button>
        </div>
        <div className="relative flex rounded-lg border">
          <ItemGroup className="w-1/3">
            {map(featureFlags, (featureFlag, index) => (
              <React.Fragment key={featureFlag._id}>
                <Item>
                  <ItemContent className="gap-1">
                    <ItemTitle>{featureFlag.name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      asChild
                    >
                      <Link to={featureFlagsUrl(featureFlag._id)}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </ItemActions>
                </Item>
                {index !== featureFlags.length - 1 && <ItemSeparator />}
              </React.Fragment>
            ))}
          </ItemGroup>
          <Separator
            orientation="vertical"
            className="absolute left-1/3 h-full"
          />
          <div className="w-2/3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
