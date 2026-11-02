import { AbortedException } from "@mantlebee/ts-core";

/**
 * Runs `run` on behalf of a caller that may abort: rejects with the
 * `AbortedException` of ts-core at once when `signal` is already aborted
 * (`run` is not invoked) or as soon as it is aborted while the promise is
 * pending, whatever `run` does with the signal afterwards; without a signal
 * it is `run()`. A settlement of the promise after the abort is ignored, and
 * never surfaces as an unhandled rejection.
 *
 * Internal to the package, kept out of the public API: a candidate for the
 * promise utils of ts-core.
 * @param signal Signal of the caller, if any.
 * @param run Work to do; it receives nothing, the caller closes over its arguments.
 */
export function abortable<TResult>(
  signal: AbortSignal | undefined,
  run: () => Promise<TResult>,
): Promise<TResult> {
  if (!signal) return run();
  if (signal.aborted) return Promise.reject(new AbortedException());
  return new Promise<TResult>((resolve, reject) => {
    const onAbort = (): void => reject(new AbortedException());
    signal.addEventListener("abort", onAbort, { once: true });
    const settling =
      <T>(settle: (value: T) => void) =>
      (value: T): void => {
        signal.removeEventListener("abort", onAbort);
        settle(value);
      };
    run().then(settling(resolve), settling(reject));
  });
}
