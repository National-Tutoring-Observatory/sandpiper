import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collection } from "@/components/ui/collection";
import getDateString from "~/modules/app/helpers/getDateString";
import type { BillingLedgerEntry } from "~/modules/billing/billing.types";

interface PaginatedCredits {
  data: BillingLedgerEntry[];
  count: number;
  totalPages: number;
}

interface CreditHistoryProps {
  credits: PaginatedCredits;
  searchValue: string;
  currentPage: number;
  isSyncing: boolean;
  onSearchValueChanged: (value: string) => void;
  onPaginationChanged: (page: number) => void;
}

function getCreditDescription(credit: BillingLedgerEntry) {
  const metadata = credit.metadata ?? {};
  let note: string | undefined;

  if (typeof metadata.note === "string") {
    note = metadata.note;
  } else if (typeof metadata.legacyNote === "string") {
    note = metadata.legacyNote;
  }

  if (credit.source === "stripe-topup") {
    return "Purchased via Stripe";
  }

  if (credit.source === "initial-credit") {
    return note ?? "Initial credits";
  }

  return note;
}

function getCreditItemAttributes(credit: BillingLedgerEntry) {
  return {
    id: credit._id,
    title: `$${credit.amount.toFixed(2)}`,
    description: getCreditDescription(credit),
    meta: [{ text: getDateString(credit.createdAt) }],
  };
}

export default function CreditHistory({
  credits,
  searchValue,
  currentPage,
  isSyncing,
  onSearchValueChanged,
  onPaginationChanged,
}: CreditHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading">Credit history</CardTitle>
      </CardHeader>
      <CardContent>
        <Collection
          items={credits.data}
          itemsLayout="list"
          hasSearch
          hasPagination
          searchValue={searchValue}
          currentPage={currentPage}
          totalPages={credits.totalPages}
          isSyncing={isSyncing}
          filters={[]}
          filtersValues={{}}
          onSortValueChanged={() => {}}
          emptyAttributes={{
            title: "No credits added yet",
            description: "Add credits to get started.",
          }}
          getItemAttributes={getCreditItemAttributes}
          getItemActions={() => []}
          onSearchValueChanged={onSearchValueChanged}
          onPaginationChanged={onPaginationChanged}
          onActionClicked={() => {}}
        />
      </CardContent>
    </Card>
  );
}
