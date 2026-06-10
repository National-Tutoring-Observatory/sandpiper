import { ToggleGroup } from "@/components/ui/toggle-group";
import { useLocation, useNavigate } from "react-router";
import { queuesUrl } from "../helpers/queueUrls";
import { QueueTab } from "./queueTab";

interface QueueState {
  key: string;
  label: string;
  count: number;
}

interface QueueStateTabsProps {
  queueType: string;
  states: QueueState[];
}

export default function QueueStateTabs({
  queueType,
  states,
}: QueueStateTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const currentValue =
    states.find((state) => currentPath.includes(`/${state.key}`))?.key ||
    states[0]?.key;

  const handleValueChange = (value: string) => {
    if (value) {
      navigate(queuesUrl(queueType, value));
    }
  };

  return (
    <div>
      <ToggleGroup
        type="single"
        variant="outline"
        value={currentValue}
        onValueChange={handleValueChange}
        aria-label="Queue state filter"
      >
        {states.map((state) => (
          <QueueTab
            key={state.key}
            value={state.key}
            label={state.label}
            count={state.count}
            ariaLabel={`${state.label} jobs (${state.count} items)`}
          />
        ))}
      </ToggleGroup>
    </div>
  );
}
