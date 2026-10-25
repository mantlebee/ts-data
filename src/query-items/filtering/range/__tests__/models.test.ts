import { FilterRange, FilterRangeLimit } from "../models";
import { Range, RangeLimit } from "../types";

describe("FilterRangeLimit", () => {
  describe("initial state", () => {
    test("Is unset by default", () => {
      const limit = new FilterRangeLimit<number>();
      expect(limit.value).toBeNull();
      expect(limit.hasValue).toBe(false);
      expect(limit.exclude).toBe(false);
    });
    test("Exposes the given value and exclusion", () => {
      const limit = new FilterRangeLimit<number>(5, true);
      expect(limit.value).toBe(5);
      expect(limit.hasValue).toBe(true);
      expect(limit.exclude).toBe(true);
    });
    test("A value of 0 counts as a value", () => {
      const limit = new FilterRangeLimit<number>(0);
      expect(limit.hasValue).toBe(true);
    });
  });

  describe("toRangeLimit", () => {
    test("Returns null when unset", () => {
      expect(new FilterRangeLimit<number>().toRangeLimit()).toBeNull();
    });
    test("Returns value and exclusion when set", () => {
      expect(new FilterRangeLimit<number>(5, true).toRangeLimit()).toEqual({
        value: 5,
        exclude: true,
      });
    });
  });

  describe("setValue", () => {
    test("Updates the value and raises change with the new RangeLimit", () => {
      const limit = new FilterRangeLimit<number>(null, true);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setValue(7);
      expect(limit.value).toBe(7);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 7, exclude: true });
    });
    test("Raises change with null when set to null", () => {
      const limit = new FilterRangeLimit<number>(7);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setValue(null);
      expect(limit.value).toBeNull();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(null);
    });
    test("Raises nothing when the value is the same", () => {
      const limit = new FilterRangeLimit<number>(7);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setValue(7);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Raises nothing when an unset limit is set to null", () => {
      const limit = new FilterRangeLimit<number>();
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setValue(null);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("setExclude", () => {
    test("Updates the exclusion and raises change", () => {
      const limit = new FilterRangeLimit<number>(3);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setExclude(true);
      expect(limit.exclude).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 3, exclude: true });
    });
    test("Raises nothing when the exclusion is the same", () => {
      const limit = new FilterRangeLimit<number>(3, true);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setExclude(true);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Raises change with null when the limit has no value", () => {
      const limit = new FilterRangeLimit<number>();
      const handler = jest.fn();
      limit.on("change", handler);
      limit.setExclude(true);
      expect(handler).toHaveBeenCalledWith(null);
    });
  });

  describe("toggleExclude", () => {
    test("Flips the exclusion and raises change every time", () => {
      const limit = new FilterRangeLimit<number>(3);
      const handler = jest.fn();
      limit.on("change", handler);
      limit.toggleExclude();
      expect(limit.exclude).toBe(true);
      limit.toggleExclude();
      expect(limit.exclude).toBe(false);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, { value: 3, exclude: true });
      expect(handler).toHaveBeenNthCalledWith(2, { value: 3, exclude: false });
    });
  });

  describe("matchesTo", () => {
    test("Matches when value and exclusion are the same", () => {
      const a = new FilterRangeLimit<number>(5, true);
      const b = new FilterRangeLimit<number>(5, true);
      expect(a.matchesTo(b)).toBe(true);
    });
    test("Matches when both are unset", () => {
      const a = new FilterRangeLimit<number>();
      const b = new FilterRangeLimit<number>();
      expect(a.matchesTo(b)).toBe(true);
    });
    test("Does not match when values differ", () => {
      const a = new FilterRangeLimit<number>(5);
      const b = new FilterRangeLimit<number>(6);
      expect(a.matchesTo(b)).toBe(false);
    });
    test("Does not match when exclusions differ", () => {
      const a = new FilterRangeLimit<number>(5, true);
      const b = new FilterRangeLimit<number>(5, false);
      expect(a.matchesTo(b)).toBe(false);
    });
  });
});

describe("FilterRange", () => {
  describe("constructor", () => {
    test("Limits are unset by default", () => {
      const range = new FilterRange<number>();
      expect(range.min.value).toBeNull();
      expect(range.max.value).toBeNull();
      expect(range.min.exclude).toBe(false);
      expect(range.max.exclude).toBe(false);
    });
    test("Initialises the limits with the values and the exclusions", () => {
      const range = new FilterRange<number>(1, 9, true, false);
      expect(range.min.value).toBe(1);
      expect(range.max.value).toBe(9);
      expect(range.min.exclude).toBe(true);
      expect(range.max.exclude).toBe(false);
      const other = new FilterRange<number>(1, 9, false, true);
      expect(other.min.exclude).toBe(false);
      expect(other.max.exclude).toBe(true);
    });
  });

  describe("isValid", () => {
    test("Is false when no limit is set", () => {
      expect(new FilterRange<number>().isValid).toBe(false);
    });
    test("Is true when only min is set", () => {
      expect(new FilterRange<number>(1).isValid).toBe(true);
    });
    test("Is true when only max is set", () => {
      expect(new FilterRange<number>(null, 9).isValid).toBe(true);
    });
    test("Is true when both limits are set", () => {
      expect(new FilterRange<number>(1, 9).isValid).toBe(true);
    });
  });

  describe("isClosed", () => {
    test("Is false when no limit is set", () => {
      expect(new FilterRange<number>().isClosed).toBe(false);
    });
    test("Is false when only one limit is set", () => {
      expect(new FilterRange<number>(1).isClosed).toBe(false);
      expect(new FilterRange<number>(null, 9).isClosed).toBe(false);
    });
    test("Is true when both limits are set", () => {
      expect(new FilterRange<number>(1, 9).isClosed).toBe(true);
    });
  });

  describe("limitsMatch", () => {
    test("Is true when both limits are set and equal", () => {
      expect(new FilterRange<number>(5, 5).limitsMatch).toBe(true);
    });
    test("Is false when the values differ", () => {
      expect(new FilterRange<number>(1, 9).limitsMatch).toBe(false);
    });
    test("Is false when the exclusions differ", () => {
      expect(new FilterRange<number>(5, 5, true, false).limitsMatch).toBe(
        false,
      );
    });
    test("Is false when no limit is set", () => {
      expect(new FilterRange<number>().limitsMatch).toBe(false);
    });
    test("Is false when only one limit is set", () => {
      expect(new FilterRange<number>(5).limitsMatch).toBe(false);
    });
  });

  describe("toRange", () => {
    test("Returns null limits when unset", () => {
      expect(new FilterRange<number>().toRange()).toEqual({
        min: null,
        max: null,
      });
    });
    test("Returns both limits when set", () => {
      expect(new FilterRange<number>(1, 9, true, false).toRange()).toEqual({
        min: { value: 1, exclude: true },
        max: { value: 9, exclude: false },
      });
    });
    test("Returns only the limit that is set", () => {
      expect(new FilterRange<number>(null, 9).toRange()).toEqual({
        min: null,
        max: { value: 9, exclude: false },
      });
    });
    test("Keeps the type of the values", () => {
      const range: Range<number> = new FilterRange<number>(1, 9).toRange();
      const min: RangeLimit<number> | null = range.min;
      const value: number | undefined = range.min?.value;
      expect(typeof value).toBe("number");
      expect(min?.value).toBe(1);
    });
    test("Reflects the current state of the limits", () => {
      const range = new FilterRange<number>(1, 9);
      range.min.setValue(3);
      range.max.toggleExclude();
      expect(range.toRange()).toEqual({
        min: { value: 3, exclude: false },
        max: { value: 9, exclude: true },
      });
    });
  });

  describe("change event", () => {
    test("Min value change raises one change with the new range", () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      range.min.setValue(2);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(range.toRange());
      expect(handler).toHaveBeenCalledWith({
        min: { value: 2, exclude: false },
        max: { value: 9, exclude: false },
      });
    });
    test("Max value change raises one change with the new range", () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      range.max.setValue(10);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        min: { value: 1, exclude: false },
        max: { value: 10, exclude: false },
      });
    });
    test("Exclusion change of a limit raises one change", () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      range.min.toggleExclude();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        min: { value: 1, exclude: true },
        max: { value: 9, exclude: false },
      });
    });
    test("A no-op change on a limit raises nothing on the range", () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      range.min.setValue(1);
      range.max.setValue(9);
      range.min.setExclude(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    test("Unsets both limits", () => {
      const range = new FilterRange<number>(1, 9);
      range.clear();
      expect(range.min.hasValue).toBe(false);
      expect(range.max.hasValue).toBe(false);
      expect(range.toRange()).toEqual({ min: null, max: null });
    });
    test("Raises change twice when both limits were set", () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      range.clear();
      expect(handler).toHaveBeenCalledTimes(2);
    });
    test("Raises change once when one limit was set", () => {
      const range = new FilterRange<number>(1);
      const handler = jest.fn();
      range.on("change", handler);
      range.clear();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ min: null, max: null });
    });
    test("Raises nothing when no limit was set", () => {
      const range = new FilterRange<number>();
      const handler = jest.fn();
      range.on("change", handler);
      range.clear();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    test("Resolves", async () => {
      const range = new FilterRange<number>(1, 9);
      await expect(range.dispose()).resolves.toBeUndefined();
    });
    test("Changing a limit afterwards raises no change on the range", async () => {
      const range = new FilterRange<number>(1, 9);
      const handler = jest.fn();
      range.on("change", handler);
      await range.dispose();
      range.min.setValue(2);
      range.max.setValue(10);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Removes the handlers registered on the limits", async () => {
      const range = new FilterRange<number>(1, 9);
      const minHandler = jest.fn();
      const maxHandler = jest.fn();
      range.min.on("change", minHandler);
      range.max.on("change", maxHandler);
      await range.dispose();
      range.min.setValue(2);
      range.max.setValue(10);
      expect(minHandler).not.toHaveBeenCalled();
      expect(maxHandler).not.toHaveBeenCalled();
    });
  });
});
