import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { ProjectionExtensionEvents } from "./types";

/**
 * Extension that adds the list of {@link Projection} to the payload. Every
 * mutation raises its own event at once and schedules the debounced
 * `projectionsChange` event (see {@link ProjectionExtensionEvents}).
 * @typeParam TItem Type of the items.
 */
export interface IProjectionExtension<TItem = Any>
  extends IDataSourceExtension<TItem, ProjectionExtensionEvents<TItem>> {
  /** `true` when at least one projection is set. */
  readonly hasProjections: boolean;
  /** Current projections, in insertion order; empty means "every field". */
  readonly projections: List<Projection<TItem>>;
  /**
   * Appends a projection.
   * @param projection Projection to add; ignored, without events, when a
   * projection on the same field already exists.
   */
  addProjection(projection: Projection<TItem>): void;
  /**
   * Removes every projection.
   */
  clearProjections(): void;
  /**
   * Removes the projection on a field, if any.
   * @param field Field no longer projected.
   */
  removeProjection(field: KeyOf<TItem>): void;
  /**
   * Replaces every projection.
   * @param projections New projections, taken as they are (duplicates are not removed).
   */
  setProjections(projections: List<Projection<TItem>>): void;
}
