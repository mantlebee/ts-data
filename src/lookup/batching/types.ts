/**
 * Options of {@link withBatching}.
 */
export type BatchingOptions = {
  /**
   * Largest number of values sent to the inner source in one `resolve`, a
   * positive integer; no limit by default. A batch with more values is split
   * into as many calls, run together.
   */
  chunkSize?: number;
};
