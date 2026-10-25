import { Any, EventsDefinition, Nullable } from "@mantlebee/ts-core";

/**
 * Events of a {@link FilterRange}.
 */
export type FilterRangeEvents<TValue = Any> = EventsDefinition & {
  /** Either limit changed: the current range. */
  change: [Range<TValue>];
};
/**
 * Events of a {@link FilterRangeLimit}.
 */
export type FilterRangeLimitEvents<TValue = Any> = EventsDefinition & {
  /** Value or exclusion changed: the current limit, `null` when unset. */
  change: [Nullable<RangeLimit<TValue>>];
};

/**
 * Interval with optional limits, value of a {@link FilterOperators.range} filter.
 */
export type Range<TValue = Any> = {
  max: Nullable<RangeLimit<TValue>>;
  min: Nullable<RangeLimit<TValue>>;
};
/**
 * One end of a {@link Range}.
 */
export type RangeLimit<TValue = Any> = {
  /** `true` when the limit itself is out of the range (strict comparison). */
  exclude: boolean;
  value: TValue;
};
