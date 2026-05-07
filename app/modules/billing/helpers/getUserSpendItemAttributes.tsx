import type { CollectionItemAttributes } from "@/components/ui/collectionItemContent";
import { DollarSign, FlaskConical, Wrench } from "lucide-react";
import type { UserCostRow } from "../services/getUserCosts.server";

export default function getUserSpendItemAttributes(
  row: UserCostRow,
): CollectionItemAttributes {
  return {
    id: row.userId,
    title: row.userName,
    meta: [
      {
        text: `$${row.totalBilledCosts.toFixed(2)}`,
        icon: <DollarSign className="h-3 w-3" />,
      },
      {
        text: `$${row.runCosts.toFixed(2)} runs`,
        icon: <FlaskConical className="h-3 w-3" />,
      },
      {
        text: `$${row.nonRunCosts.toFixed(2)} other`,
        icon: <Wrench className="h-3 w-3" />,
      },
    ],
  };
}
