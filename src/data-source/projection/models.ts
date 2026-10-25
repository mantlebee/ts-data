import { KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

import { DataSourceExtension } from "../models";
import { DataSourceExtensionOptions, DataSourcePayload } from "../types";
import { IProjectionExtension } from "./interfaces";
import { ProjectionExtensionEvents } from "./types";

/**
 * Keeps the list of projected fields and always sends it in the payload
 * (an empty list means "every field").
 * @typeParam TItem Type of the items.
 */
export class ProjectionExtension<TItem>
  extends DataSourceExtension<TItem, ProjectionExtensionEvents<TItem>>
  implements IProjectionExtension<TItem>
{
  protected _projections: List<Projection<TItem>> = [];

  /**
   * @param options Debounce of the `projectionsChange` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super(options);
  }

  public get hasProjections(): boolean {
    return this._projections.length > 0;
  }
  public get projections(): List<Projection<TItem>> {
    return this._projections;
  }

  public addProjection(projection: Projection<TItem>): void {
    if (this._projections.some((a) => a.field === projection.field)) return;
    this._projections = this._projections.concat(projection);
    this._eventBus.trigger("addProjection", projection, this.projections);
    this._scheduleChange();
  }
  public clearProjections(): void {
    this._projections = [];
    this._eventBus.trigger("clearProjections");
    this._scheduleChange();
  }
  public removeProjection(field: KeyOf<TItem>): void {
    this._projections = this._projections.filter((a) => a.field !== field);
    this._eventBus.trigger("removeProjection", field, this.projections);
    this._scheduleChange();
  }
  public setProjections(projections: List<Projection<TItem>>): void {
    this._projections = projections;
    this._eventBus.trigger("setProjections", this.projections);
    this._scheduleChange();
  }

  //#region Extension Methods
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.projections = this.projections;
    return payload;
  }
  protected _triggerChange(): void {
    this._eventBus.trigger(
      "projectionsChange",
      this.projections,
      this.hasProjections,
    );
  }
  //#endregion
}
