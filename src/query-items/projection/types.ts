import { Any, KeyOf } from "@mantlebee/ts-core";

export type Projection<TItem = Any> = {
  field: KeyOf<TItem>;
};
