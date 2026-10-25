import { Any, KeyOf } from "@mantlebee/ts-core";

/**
 * Order of the items of a {@link QueryItemsPayload} by one field.
 * @typeParam TItem Type of the items.
 */
export type Sort<TItem = Any> = {
  /** `true` for ascending, `false` for descending. */
  asc: boolean;
  /** Field to sort by. */
  field: KeyOf<TItem>;
};
