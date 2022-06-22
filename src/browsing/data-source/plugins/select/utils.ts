import { List, Nullable } from "@mantlebee/ts-core";

import { Select } from "@/browsing";

export function addSelect<TItem>(
  selects: Nullable<List<Select<TItem>>>,
  select: Select<TItem>
): List<Select<TItem>> {
  if (!selects) selects = [select];
  else {
    selects = selects.filter((a) => a.alias !== select.alias);
    selects.push(select);
  }
  return selects;
}
