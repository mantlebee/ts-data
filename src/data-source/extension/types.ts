/**
 * Options of a {@link DataSourceExtension}.
 */
export type DataSourceExtensionOptions = {
  /**
   * Milliseconds of quiet time before the debounced `*Change` event of the
   * extension is raised. Default {@link DataSourceExtensionChangeDelayDefault}.
   */
  changeDelay?: number;
};
