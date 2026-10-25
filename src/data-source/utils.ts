import { EventSubscription, List } from "@mantlebee/ts-core";

import type { IFilterExtension } from "./filtering/interfaces";
import type { IPaginationExtension } from "./pagination/interfaces";

/**
 * Goes back to the first page whenever the filters change, so the next read
 * never asks for a page that may no longer exist. Listens to the synchronous
 * events of the filtering (not to the debounced `filtersChange`), so the page
 * is already reset when a read follows the change immediately.
 * @param filtering Extension whose changes reset the page.
 * @param paginating Extension sent back to the first page.
 * @returns a subscription; dispose it to stop resetting the page.
 */
export function resetPageOnFiltersChange<TItem>(
  filtering: IFilterExtension<TItem>,
  paginating: IPaginationExtension<TItem>,
): EventSubscription {
  const reset = () => paginating.goToFirstPage();
  const subscriptions: List<EventSubscription> = [
    filtering.on("addFilter", reset),
    filtering.on("clearFilters", reset),
    filtering.on("removeFilter", reset),
    filtering.on("removeFiltersOf", reset),
    filtering.on("replaceFiltersOf", reset),
    filtering.on("setFilters", reset),
    filtering.on("setLogic", reset),
  ];
  return {
    dispose: async () => {
      for (const subscription of subscriptions) await subscription.dispose();
    },
  };
}
