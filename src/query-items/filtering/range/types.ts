import { Any, EventsDefinition, Nullable } from "@mantlebee/ts-core";

export type FilterRangeEvents<TValue = Any> = EventsDefinition & {
  change: [Range<TValue>]; // actual range, raised when either limit changes
};
export type FilterRangeLimitEvents<TValue = Any> = EventsDefinition & {
  change: [Nullable<RangeLimit<TValue>>]; // actual limit, raised when value or exclude change
};

export type Range<TValue = Any> = {
  max: Nullable<RangeLimit<TValue>>;
  min: Nullable<RangeLimit<TValue>>;
};
export type RangeLimit<TValue = Any> = { exclude: boolean; value: TValue };
