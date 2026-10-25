import {
  Any,
  EventSubscription,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import {
  FilterRangeEvents,
  FilterRangeLimitEvents,
  Range,
  RangeLimit,
} from "./types";

/**
 * Editable {@link Range}, meant for UI controls: two {@link FilterRangeLimit}
 * whose changes raise a single `change` event with the resulting range.
 * @typeParam TValue Type of the limits.
 * @example
 * ```ts
 * const price = new FilterRange<number>();
 * price.on("change", (range) =>
 *   filtering.replaceFiltersOf("price", {
 *     field: "price",
 *     operator: FilterOperators.range,
 *     value: range,
 *   }),
 * );
 * price.min.setValue(10); // change: { min: { value: 10, exclude: false }, max: null }
 * price.max.setValue(20); // change: both limits set, price.isClosed is now true
 * ```
 */
export class FilterRange<TValue = Any> extends Subscribable<
  FilterRangeEvents<TValue>
> {
  /** Upper limit. */
  public readonly max: FilterRangeLimit<TValue>;
  /** Lower limit. */
  public readonly min: FilterRangeLimit<TValue>;

  private readonly _subscriptions: List<EventSubscription>;

  /**
   * @param min Initial minimum, `null` when unset.
   * @param max Initial maximum, `null` when unset.
   * @param excludeMin Initial exclusion of the minimum.
   * @param excludeMax Initial exclusion of the maximum.
   */
  public constructor(
    min: Nullable<TValue> = null,
    max: Nullable<TValue> = null,
    excludeMin: boolean = false,
    excludeMax: boolean = false,
  ) {
    super();
    this.max = new FilterRangeLimit(max, excludeMax);
    this.min = new FilterRangeLimit(min, excludeMin);
    this._subscriptions = [
      this.max.on("change", () => this._onChange()),
      this.min.on("change", () => this._onChange()),
    ];
  }

  /**
   * A range is closed when both limits are set.
   */
  public get isClosed(): boolean {
    return this.min.hasValue && this.max.hasValue;
  }
  /**
   * A range is valid when at least one limit is set.
   */
  public get isValid(): boolean {
    return this.min.hasValue || this.max.hasValue;
  }
  /**
   * When limits match the range is like an "equal".
   */
  public get limitsMatch(): boolean {
    return this.isValid && this.min.matchesTo(this.max);
  }

  /**
   * Unsets both limits. Raises a `change` event for each limit that was set.
   */
  public clear(): void {
    this.max.setValue(null);
    this.min.setValue(null);
  }
  /**
   * Disposes the limits, their subscriptions and the handlers of this range.
   */
  public async dispose(): Promise<void> {
    for (const subscription of this._subscriptions) await subscription.dispose();
    await this.max.dispose();
    await this.min.dispose();
    await super.dispose();
  }
  /**
   * @returns the plain {@link Range} described by the two limits.
   */
  public toRange(): Range<TValue> {
    return {
      max: this.max.toRangeLimit(),
      min: this.min.toRangeLimit(),
    };
  }

  protected _onChange(): void {
    this._eventBus.trigger("change", this.toRange());
  }
}

/**
 * Editable {@link RangeLimit}: a value (`null` when unset) and an exclusion
 * flag. Raises `change` only when one of the two actually changes.
 * @typeParam TValue Type of the value.
 */
export class FilterRangeLimit<TValue = Any> extends Subscribable<
  FilterRangeLimitEvents<TValue>
> {
  /**
   * @param value Initial value, `null` when unset.
   * @param exclude Initial exclusion.
   */
  public constructor(value: Nullable<TValue> = null, exclude: boolean = false) {
    super();
    this._exclude = exclude;
    this._value = value;
  }

  /**
   * @param filterRangeLimit Limit to compare with.
   * @returns `true` when value and exclusion are the same.
   */
  public matchesTo(filterRangeLimit: FilterRangeLimit<TValue>): boolean {
    return (
      this.exclude === filterRangeLimit.exclude &&
      this.value === filterRangeLimit.value
    );
  }
  /**
   * @returns the plain {@link RangeLimit}, or `null` when the value is unset.
   */
  public toRangeLimit(): Nullable<RangeLimit<TValue>> {
    if (this.hasValue)
      return {
        exclude: this.exclude,
        value: this.value as TValue,
      };
    else return null;
  }

  protected _onChange(): void {
    this._eventBus.trigger("change", this.toRangeLimit());
  }

  //#region Exclude
  private _exclude: boolean;

  /** `true` when the limit itself is out of the range (strict comparison). */
  public get exclude(): boolean {
    return this._exclude;
  }

  /**
   * @param exclude New exclusion; nothing happens when it is the current one.
   */
  public setExclude(exclude: boolean): void {
    if (exclude === this._exclude) return;
    this._exclude = exclude;
    this._onChange();
  }
  /**
   * Inverts the exclusion, always raising `change`.
   */
  public toggleExclude(): void {
    this.setExclude(!this._exclude);
  }
  //#endregion

  //#region Value
  private _value: Nullable<TValue>;

  /** `true` when the value is set (not `null`). */
  public get hasValue(): boolean {
    return this.value !== null;
  }

  /** Current value, `null` when unset. */
  public get value(): Nullable<TValue> {
    return this._value;
  }
  /**
   * @param value New value, `null` to unset; nothing happens when it is the
   * current one (compared with `===`).
   */
  public setValue(value: Nullable<TValue>): void {
    if (value === this.value) return;
    this._value = value;
    this._onChange();
  }
  //#endregion
}
