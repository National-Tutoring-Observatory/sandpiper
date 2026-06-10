import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Outlet, useLocation, useNavigate } from "react-router";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import { adminBillingUrl } from "../helpers/billingUrls";

const TABS = [
  { key: "spend-overview", path: adminBillingUrl(), label: "Spend Overview" },
  {
    key: "active-users",
    path: adminBillingUrl("active-users"),
    label: "Active Teams",
  },
];

export default function BillingLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue =
    TABS.find(
      (t) =>
        t.path === location.pathname ||
        (t.key !== "spend-overview" && location.pathname.includes(t.key)),
    )?.key ?? TABS[0].key;

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={[{ text: "Billing" }]} />
        </PageHeaderLeft>
      </PageHeader>
      <div className="mb-6">
        <ToggleGroup
          type="single"
          variant="outline"
          value={currentValue}
          onValueChange={(value) => {
            const tab = TABS.find((t) => t.key === value);
            if (tab) navigate(tab.path);
          }}
          aria-label="Billing section"
        >
          {TABS.map((tab) => (
            <ToggleGroupItem key={tab.key} value={tab.key}>
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Outlet />
    </div>
  );
}
