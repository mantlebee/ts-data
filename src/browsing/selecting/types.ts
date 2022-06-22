import { Any, KeyOf } from "@mantlebee/ts-core";

export type Select<TItem> = {
  alias: string;
  defaultValue?: Any;
  key?: KeyOf<TItem>;
};
