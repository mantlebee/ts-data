import {
  BrowseItemsPayload,
  FilterOperations,
  FilterOperators,
} from "@/browsing";
import { GenericItem } from "@/fake";

import { DataSourceForQueryable, Queryable } from "../models";

describe("Queryable", () => {
  it("It works!", async () => {
    let payload: BrowseItemsPayload<GenericItem> = {};
    const dataSource = new DataSourceForQueryable<GenericItem>((a) => {
      payload = a;
      return Promise.resolve([]);
    });
    await new Queryable(dataSource)
      .where("age")
      .isGreaterThan(18)
      .and("gender")
      .isEqualTo(1)
      .or("maritalStatus")
      .isFalse()
      .skip(10)
      .top(5)
      .sortBy("username", true)
      .read();
    expect(payload).toEqual({
      filters: {
        childExpressions: [
          {
            childExpressions: [],
            filters: [
              {
                field: "maritalStatus",
                operation: FilterOperations.equal,
                value: false,
              },
            ],
            operator: FilterOperators.or,
          },
        ],
        filters: [
          {
            field: "age",
            operation: FilterOperations.greaterThan,
            value: 18,
          },
          { field: "gender", operation: FilterOperations.equal, value: 1 },
        ],
        operator: FilterOperators.and,
      },
      sorts: [{ by: "username", asc: true }],
      skip: 10,
      top: 5,
    });
  });
});
