import { Any, KeyOf } from "@mantlebee/ts-core";

/**
 * Field to return in the items of a {@link QueryItemsPayload}.
 * @typeParam TItem Type of the items.
 */
export type Projection<TItem = Any> = {
  /** Field to return. */
  field: KeyOf<TItem>;
};
