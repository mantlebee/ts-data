import {
  Any,
  DebouncedDelegate,
  KeyOf,
  List,
  Subscribable,
} from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

import { DataSourcePayload } from "../types";
import { IProjectionExtension } from "./interfaces";
import { ProjectionExtensionEvents } from "./types";

export class ProjectionExtension<TItem = Any>
  extends Subscribable<ProjectionExtensionEvents<TItem>>
  implements IProjectionExtension<TItem>
{
  protected readonly _onProjectionsChange = new DebouncedDelegate(
    () =>
      this._eventBus.trigger(
        "projectionsChange",
        this.projections,
        this.hasProjections,
      ),
    100,
  );

  protected _projections: List<Projection<TItem>> = [];

  public get hasProjections(): boolean {
    return this._projections.length > 0;
  }
  public get projections(): List<Projection<TItem>> {
    return this._projections;
  }

  public addProjection(projection: Projection<TItem>): void {
    if (!this._projections.find((a) => a.field === projection.field)) {
      this._projections.push(projection);
      this._eventBus.trigger("addProjection", projection, this.projections);
      this._onProjectionsChange.call();
    }
  }
  public clearProjections(): void {
    this._projections = [];
    this._eventBus.trigger("clearProjections");
    this._onProjectionsChange.call();
  }
  public removeProjection(field: KeyOf<TItem>): void {
    this._projections = this._projections.filter((a) => a.field !== field);
    this._eventBus.trigger("removeProjection", field, this.projections);
    this._onProjectionsChange.call();
  }
  public setProjections(projections: List<Projection<TItem>>): void {
    this._projections = projections;
    this._eventBus.trigger("setProjections", this.projections);
    this._onProjectionsChange.call();
  }

  //#region Extension Methods
  public getCountBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.projections = this.projections;
    return Promise.resolve(payload);
  }
  public getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.projections = this.projections;
    return Promise.resolve(payload);
  }
  //#endregion
}
