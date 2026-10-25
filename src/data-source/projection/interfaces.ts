import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { ProjectionExtensionEvents } from "./types";

/**
 * Extension that adds the list of {@link Projection} to the payload.
 */
export interface IProjectionExtension<TItem = Any>
  extends IDataSourceExtension<TItem, ProjectionExtensionEvents<TItem>> {
  /** `true` when at least one projection is set. */
  readonly hasProjections: boolean;
  readonly projections: List<Projection<TItem>>;
  /**
   * @param projection Projection to add; ignored, without events, when a
   * projection on the same field already exists.
   */
  addProjection(projection: Projection<TItem>): void;
  clearProjections(): void;
  removeProjection(field: KeyOf<TItem>): void;
  setProjections(projections: List<Projection<TItem>>): void;
}
