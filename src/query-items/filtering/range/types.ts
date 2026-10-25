import { Any, EventsDefinition, Nullable } from "@mantlebee/ts-core";

/**
 * Events of a {@link FilterRange}.
 * @typeParam TValue Type of the limits.
 */
export type FilterRangeEvents<TValue = Any> = EventsDefinition & {
  /** Either limit changed: the current range. */
  change: [Range<TValue>];
};
/**
 * Events of a {@link FilterRangeLimit}.
 * @typeParam TValue Type of the value.
 */
export type FilterRangeLimitEvents<TValue = Any> = EventsDefinition & {
  /** Value or exclusion changed: the current limit, `null` when unset. */
  change: [Nullable<RangeLimit<TValue>>];
};

/**
 * Interval with optional limits, value of a {@link FilterOperators.range}
 * filter. A `null` limit means unbounded on that side.
 * @typeParam TValue Type of the limits.
 */
export type Range<TValue = Any> = {
  /** Upper limit, `null` when unbounded. */
  max: Nullable<RangeLimit<TValue>>;
  /** Lower limit, `null` when unbounded. */
  min: Nullable<RangeLimit<TValue>>;
};
/**
 * One end of a {@link Range}.
 * @typeParam TValue Type of the value.
 */
export type RangeLimit<TValue = Any> = {
  /** `true` when the limit itself is out of the range (strict comparison). */
  exclude: boolean;
  /** Value of the limit. */
  value: TValue;
};
