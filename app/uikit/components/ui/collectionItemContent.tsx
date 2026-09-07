import map from "lodash/map";
import { type ReactElement } from "react";
import { Badge } from "./badge";
import type { CollectionItemAction } from "./collectionItemActions";
import { ItemContent, ItemDescription, ItemTitle } from "./item";

export type CollectionItemMeta = {
  text: string;
  icon?: ReactElement;
  color?: string;
};

export type CollectionItemAttributes = {
  id: string;
  title: string;
  description?: string;
  to?: string;
  meta?: CollectionItemMeta[];
  isDisabled?: boolean;
};

export type CollectionItemProps = {
  id: string;
  title: string;
  description?: string;
  to?: string;
  meta?: CollectionItemMeta[];
  actions: CollectionItemAction[];
  isDisabled?: boolean;
  onItemActionClicked?: ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => void;
};

const CollectionItemContent = ({
  title,
  description,
  meta = [],
}: Omit<
  CollectionItemProps,
  "to" | "id" | "actions" | "isDisabled" | "onItemActionClicked"
>) => (
  <ItemContent className="gap-1">
    <ItemTitle className="text-lg">{title}</ItemTitle>
    <ItemDescription>{description}</ItemDescription>
    <div className="flex w-full flex-wrap gap-2">
      {map(meta, (metaItem, index) => {
        let style = {};
        if (metaItem.color) {
          style = {
            color: metaItem.color,
            borderColor: metaItem.color,
            backgroundColor: `${metaItem.color}33`,
          };
        }
        return (
          <Badge
            key={index}
            variant="outline"
            className="text-muted-foreground"
            style={style}
          >
            {metaItem.icon && metaItem.icon}
            {metaItem.text}
          </Badge>
        );
      })}
    </div>
  </ItemContent>
);

export default CollectionItemContent;
