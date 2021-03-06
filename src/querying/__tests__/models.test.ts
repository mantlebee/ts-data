import {
  BrowseItemsPayload,
  FilterOperations,
  FilterOperators,
} from "@/browsing";
import { GenericItem } from "@/fake";

import { Queryable } from "../models";
import { getDataSourceAndPayload } from "./utils";

describe("Queryable", () => {
  it("It works!", async () => {
    const { dataSource, getPayload } = getDataSourceAndPayload();
    await new Queryable(dataSource)
      .where("age")
      .isLessThan(18)
      .and("married")
      .isFalse()
      .or("married")
      .isTrue()
      .and("gender")
      .isEqualTo(1)
      .sortBy("lastName")
      .sortBy("firstName")
      .asc()
      .sortBy("marriedOn")
      .desc()
      .take(50)
      .startingFrom(10)
      .select("age", "email", "gender", "id")
      .select("firstName")
      .as("name")
      .select("lastName")
      .as("surname")
      .add(5)
      .as("parentId")
      .read();
    const resultingPayload: BrowseItemsPayload<GenericItem> = {
      filters: {
        childExpressions: [
          {
            childExpressions: [],
            filters: [
              {
                field: "age",
                operation: FilterOperations.lessThan,
                value: 18,
              },
              {
                field: "married",
                operation: FilterOperations.equal,
                value: false,
              },
            ],
            operator: FilterOperators.and,
          },
          {
            childExpressions: [],
            filters: [
              {
                field: "married",
                operation: FilterOperations.equal,
                value: true,
              },
              { field: "gender", operation: FilterOperations.equal, value: 1 },
            ],
            operator: FilterOperators.and,
          },
        ],
        filters: [],
        operator: FilterOperators.or,
      },
      selects: [
        { key: "age", alias: "age" },
        { key: "email", alias: "email" },
        { key: "gender", alias: "gender" },
        { key: "id", alias: "id" },
        { key: "firstName", alias: "name" },
        { key: "lastName", alias: "surname" },
        { alias: "parentId", defaultValue: 5 },
      ],
      sorts: [
        { by: "lastName", asc: true },
        { by: "firstName", asc: true },
        { by: "marriedOn", asc: false },
      ],
      skip: 10,
      top: 50,
    };
    expect(getPayload()).toEqual(resultingPayload);
  });
});
