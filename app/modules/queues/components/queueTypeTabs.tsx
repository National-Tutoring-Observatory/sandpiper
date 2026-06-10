import { ToggleGroup } from "@/components/ui/toggle-group";
import { useLocation, useNavigate } from "react-router";
import { queuesUrl } from "../helpers/queueUrls";
import { QueueTab } from "./queueTab";

export interface Queue {
  key: string;
  label: string;
  count: number;
}

interface QueueTypeTabsProps {
  queues: Queue[];
}

export default function QueueTypeTabs({ queues }: QueueTypeTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const currentValue =
    queues.find((t) => currentPath.includes(`/${t.key}`))?.key ??
    queues[0]?.key ??
    "";

  const handleValueChange = (value: string) => {
    if (value) {
      navigate(queuesUrl(value, "active"));
    }
  };

  return (
    <div className="mb-6">
      <ToggleGroup
        type="single"
        variant="outline"
        value={currentValue}
        onValueChange={handleValueChange}
        aria-label="Queue type selection"
      >
        {queues.map((queue) => (
          <QueueTab
            key={queue.key}
            value={queue.key}
            label={queue.label}
            count={queue.count}
            ariaLabel={`${queue.label} queue (${queue.count} jobs)`}
          />
        ))}
      </ToggleGroup>
    </div>
  );
}
