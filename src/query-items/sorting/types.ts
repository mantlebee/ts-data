import { Any, KeyOf } from "@mantlebee/ts-core";

export type Sort<TItem = Any> = {
  asc: boolean;
  field: KeyOf<TItem>;
};
