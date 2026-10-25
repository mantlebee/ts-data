import { Any, Nullable, Subscribable } from "@mantlebee/ts-core";

import {
  FilterRangeEvents,
  FilterRangeLimitEvents,
  Range,
  RangeLimit,
} from "./types";

export class FilterRange<TValue = Any> extends Subscribable<
  FilterRangeEvents<TValue>
> {
  public readonly max: FilterRangeLimit<TValue>;
  public readonly min: FilterRangeLimit<TValue>;

  public constructor(
    min: Nullable<TValue> = null,
    max: Nullable<TValue> = null,
  ) {
    super();
    this.max = new FilterRangeLimit(max);
    this.min = new FilterRangeLimit(min);
    this.max.on("change", () => this._onChange());
    this.min.on("change", () => this._onChange());
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

  public clear(): void {
    this.max.setValue(null);
    this.min.setValue(null);
  }
  public toRange(): Range {
    return {
      max: this.max.toRangeLimit(),
      min: this.min.toRangeLimit(),
    };
  }

  protected _onChange(): void {
    this._eventBus.trigger("change", this.toRange());
  }
}

export class FilterRangeLimit<TValue = Any> extends Subscribable<
  FilterRangeLimitEvents<TValue>
> {
  public constructor(value: Nullable<TValue> = null, exclude: boolean = false) {
    super();
    this._exclude = exclude;
    this._value = value;
  }

  public matchesTo(filterRangeLimit: FilterRangeLimit<TValue>): boolean {
    return (
      this.exclude === filterRangeLimit.exclude &&
      this.value === filterRangeLimit.value
    );
  }
  public toRangeLimit(): Nullable<RangeLimit> {
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

  //#region Included
  private _exclude: boolean;

  public get exclude(): boolean {
    return this._exclude;
  }

  public setExclude(exclude: boolean): void {
    if (exclude === this._exclude) return;
    this._exclude = exclude;
    this._onChange();
  }
  public toggleExclude(): void {
    this.setExclude(!this._exclude);
  }
  //#endregion

  //#region Value
  private _value: Nullable<TValue>;

  public get hasValue(): boolean {
    return this.value !== null;
  }

  public get value(): Nullable<TValue> {
    return this._value;
  }
  public setValue(value: Nullable<TValue>) {
    if (value === this.value) return;
    this._value = value;
    this._onChange();
  }
  //#endregion
}
