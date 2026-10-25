/**
 * Page requested by a {@link QueryItemsPayload}. Pages are 1-based: the items
 * to skip are `(page - 1) * itemsPerPage`.
 */
export type Paging = {
  /** Size of a page, a positive integer. */
  itemsPerPage: number;
  /** Page requested, from 1. */
  page: number;
  /**
   * Number of items matching the query, every page included, as known by who
   * builds the payload: `0` when unknown.
   */
  totalItemsCount: number;
};
