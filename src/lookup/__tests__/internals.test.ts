import { AbortedException, isAbortedException } from "@mantlebee/ts-core";

import { tick } from "@test/fixtures/lookup";

import { abortable } from "../internals";

describe("abortable", () => {
  test("Without a signal, it is the promise of the function", async () => {
    const run = jest.fn(async () => 42);
    await expect(abortable(undefined, run)).resolves.toBe(42);
    expect(run).toHaveBeenCalledTimes(1);
  });
  test("With a signal that never aborts, it settles as the function does", async () => {
    const controller = new AbortController();
    await expect(abortable(controller.signal, async () => 42)).resolves.toBe(
      42,
    );
    const failure = new Error("boom");
    await expect(
      abortable(controller.signal, () => Promise.reject(failure)),
    ).rejects.toBe(failure);
  });
  test("With a signal already aborted, it rejects with AbortedException without running the function", async () => {
    const controller = new AbortController();
    controller.abort();
    const run = jest.fn(async () => 42);
    await expect(abortable(controller.signal, run)).rejects.toBeInstanceOf(
      AbortedException,
    );
    expect(run).not.toHaveBeenCalled();
  });
  test("Aborted while pending, it rejects with AbortedException at once and ignores the late settlement", async () => {
    const controller = new AbortController();
    let settle!: (value: number) => void;
    const pending = new Promise<number>((resolve) => (settle = resolve));
    const result = abortable(controller.signal, () => pending);
    const outcome = jest.fn();
    result.then(outcome, outcome);
    controller.abort();
    await tick();
    expect(outcome).toHaveBeenCalledTimes(1);
    expect(isAbortedException(outcome.mock.calls[0][0])).toBe(true);
    settle(42);
    await tick();
    expect(outcome).toHaveBeenCalledTimes(1);
  });
  test("Aborted while pending, a late rejection of the function is not an unhandled rejection", async () => {
    const controller = new AbortController();
    let fail!: (reason: unknown) => void;
    const pending = new Promise<number>((_, reject) => (fail = reject));
    const result = abortable(controller.signal, () => pending);
    await expect(
      (async () => {
        controller.abort();
        return result;
      })(),
    ).rejects.toBeInstanceOf(AbortedException);
    // Would surface as an unhandled rejection, failing the run, if the
    // helper did not observe the inner promise.
    fail(new Error("late"));
    await tick();
  });
  test("Once settled, the abort listener is removed", async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, "removeEventListener");
    await abortable(controller.signal, async () => 42);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
