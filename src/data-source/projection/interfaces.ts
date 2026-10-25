import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { ProjectionExtensionEvents } from "./types";

export interface IProjectionExtension<TItem = Any>
  extends IDataSourceExtension<TItem, ProjectionExtensionEvents<TItem>> {
  readonly hasProjections: boolean;
  readonly projections: List<Projection<TItem>>;
  addProjection(projection: Projection<TItem>): void;
  clearProjections(): void;
  removeProjection(field: KeyOf<TItem>): void;
  setProjections(projections: List<Projection<TItem>>): void;
}
