import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Projection } from "@/query-items";

export type ProjectionExtensionEvents<TItem = Any> = EventsDefinition & {
  // Getters
  projectionsChange: [List<Projection<TItem>>, boolean]; // [debounced] actual projections, has projections
  // Methods
  addProjection: [Projection<TItem>, List<Projection<TItem>>]; // added projection, actual projections
  clearProjections: [];
  removeProjection: [KeyOf<TItem>, List<Projection<TItem>>]; // cleared field, actual projections
  setProjections: [List<Projection<TItem>>]; // actual projections
};
