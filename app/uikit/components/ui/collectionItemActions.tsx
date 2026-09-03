import map from "lodash/map";
import { EllipsisVertical } from "lucide-react";
import type { ReactElement } from "react";
import React from "react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { ItemActions } from "./item";

export type CollectionItemAction = {
  icon?: ReactElement;
  action: string;
  text: string;
  variant?: "default" | "destructive" | undefined;
};

type CollectionItemActionsProps = {
  id: string;
  actions: CollectionItemAction[];
  isDisabled?: boolean;
  to?: string;
  onItemActionClicked?: (args: { id: string; action: string }) => void;
};

const CollectionItemActions = ({
  id,
  actions,
  isDisabled,
  to,
  onItemActionClicked,
}: CollectionItemActionsProps) => {
  if (actions.length === 0) return null;
  return (
    <ItemActions className="absolute right-4">
      {(actions.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isDisabled}>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <EllipsisVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit">
            {map(actions, (action, index) => {
              return (
                <React.Fragment key={action.action}>
                  <DropdownMenuItem
                    variant={action.variant}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (to) {
                        event.preventDefault();
                      }
                      if (onItemActionClicked) {
                        onItemActionClicked({ id, action: action.action });
                      }
                    }}
                  >
                    {action.icon ? action.icon : null}
                    {action.text}
                  </DropdownMenuItem>
                  {index !== actions.length - 1 && <DropdownMenuSeparator />}
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )) || (
        <Button
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            if (to) {
              event.preventDefault();
            }
            if (onItemActionClicked) {
              onItemActionClicked({ id, action: actions[0].action });
            }
          }}
        >
          {actions[0].icon ? actions[0].icon : null}
          {actions[0].text}
        </Button>
      )}
    </ItemActions>
  );
};

export default CollectionItemActions;
