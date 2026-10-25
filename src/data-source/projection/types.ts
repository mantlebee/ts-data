import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

/**
 * Events of a {@link ProjectionExtension}.
 * @typeParam TItem Type of the items.
 */
export type ProjectionExtensionEvents<TItem = Any> = EventsDefinition & {
  /** [debounced] Any change of the projections: current projections, whether there is any. */
  projectionsChange: [List<Projection<TItem>>, boolean];
  /** Added projection, current projections. */
  addProjection: [Projection<TItem>, List<Projection<TItem>>];
  clearProjections: [];
  /** Removed field, current projections. */
  removeProjection: [KeyOf<TItem>, List<Projection<TItem>>];
  /** Current projections. */
  setProjections: [List<Projection<TItem>>];
};
