// Imported from the root barrel on purpose: this is the public API a consumer
// of the package sees, and the only test that goes through it.
import {
  DataSource,
  DataSourcePayload,
  Filter,
  FilterExtension,
  FilterExtensionWithFixedFilters,
  FilterLogics,
  FilterOperators,
  FilterRange,
  FiltersExpression,
  PaginationExtension,
  Projection,
  ProjectionExtension,
  SingleSortExtension,
  Sort,
  SortExtension,
} from "@/index";
import {
  createCountReader,
  createItemsReader,
  GenericItem,
  GenericItems,
} from "@test/fixtures";

const ITEMS_PER_PAGE = 5;

const adult: Filter<GenericItem> = {
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
};
const single: Filter<GenericItem> = {
  field: "married",
  operator: FilterOperators.equal,
  value: false,
};
const neverMarried: Filter<GenericItem> = {
  field: "marriedOn",
  operator: FilterOperators.equal,
  value: null,
};
const someLastNames: Filter<GenericItem> = {
  field: "lastName",
  operator: FilterOperators.in,
  value: ["Amet", "Congue"],
};
const ageRange = new FilterRange<number>(20, 50, false, true);
const inAgeRange: Filter<GenericItem> = {
  field: "age",
  operator: FilterOperators.range,
  value: ageRange.toRange(),
};
const women: FiltersExpression<GenericItem> = {
  filters: [{ field: "gender", operator: FilterOperators.equal, value: "F" }],
  logic: FilterLogics.and,
};

const byLastName: Sort<GenericItem> = { asc: true, field: "lastName" };
const byFirstName: Sort<GenericItem> = { asc: true, field: "firstName" };
const byAge: Sort<GenericItem> = { asc: false, field: "age" };

const projections: Projection<GenericItem>[] = [
  { field: "id" },
  { field: "firstName" },
  { field: "lastName" },
];

/**
 * A data source with every extension of the package, in the order a consumer
 * is expected to use: filtering, sorting, projection, then pagination.
 */
function createDataSource(options: { singleSort?: boolean } = {}) {
  const count = createCountReader<GenericItem>(GenericItems.length);
  const items = createItemsReader(GenericItems);
  const filtering = new FilterExtension<GenericItem>();
  const paginating = new PaginationExtension<GenericItem>(
    count.reader,
    ITEMS_PER_PAGE,
  );
  const projecting = new ProjectionExtension<GenericItem>();
  const sorting = options.singleSort
    ? new SingleSortExtension<GenericItem>()
    : new SortExtension<GenericItem>();
  const dataSource = new DataSource<GenericItem>(items.reader, [
    filtering,
    sorting,
    projecting,
    paginating,
  ]);
  return {
    count,
    dataSource,
    filtering,
    items,
    paginating,
    projecting,
    sorting,
  };
}

describe("DataSource", () => {
  describe("payload", () => {
    describe("with every extension", () => {
      test("The first read sends the whole query, paging included, to the items reader", async () => {
        const { dataSource, filtering, items, projecting, sorting } =
          createDataSource();
        filtering.addFilter(adult);
        filtering.addFilter(single);
        filtering.addFilter(someLastNames);
        filtering.addFilter(inAgeRange);
        filtering.setLogic(FilterLogics.or);
        sorting.addSort(byLastName);
        sorting.addSort(byFirstName);
        sorting.addSort(byAge);
        projecting.setProjections(projections);
        await dataSource.read();
        const expected: DataSourcePayload<GenericItem> = {
          filters: {
            filters: [
              { field: "age", operator: FilterOperators.greaterThanOrEqual, value: 18 },
              { field: "married", operator: FilterOperators.equal, value: false },
              { field: "lastName", operator: FilterOperators.in, value: ["Amet", "Congue"] },
              {
                field: "age",
                operator: FilterOperators.range,
                value: {
                  max: { exclude: true, value: 50 },
                  min: { exclude: false, value: 20 },
                },
              },
            ],
            logic: FilterLogics.or,
          },
          paging: {
            itemsPerPage: ITEMS_PER_PAGE,
            page: 1,
            totalItemsCount: GenericItems.length,
          },
          projections: [{ field: "id" }, { field: "firstName" }, { field: "lastName" }],
          sorts: [
            { asc: true, field: "lastName" },
            { asc: true, field: "firstName" },
            { asc: false, field: "age" },
          ],
        };
        expect(items.payloads).toHaveLength(1);
        expect(items.payloads[0]).toEqual(expected);
        expect(items.payloads[0]).not.toHaveProperty("distinct");
      });
      test("The count reader receives filters, sorts and projections, but not the paging", async () => {
        const { count, dataSource, filtering, items, projecting, sorting } =
          createDataSource();
        filtering.addFilter(adult);
        sorting.addSort(byLastName);
        projecting.addProjection(projections[0]);
        await dataSource.read();
        expect(count.payloads).toHaveLength(1);
        expect(count.payloads[0]).toEqual({
          filters: { filters: [adult], logic: FilterLogics.and },
          projections: [projections[0]],
          sorts: [byLastName],
        });
        expect(count.payloads[0]).not.toHaveProperty("paging");
        // The items reader then receives the same query, completed with the paging.
        expect(items.payloads[0]).toEqual({
          ...count.payloads[0],
          paging: {
            itemsPerPage: ITEMS_PER_PAGE,
            page: 1,
            totalItemsCount: GenericItems.length,
          },
        });
      });
      test("Without any state the payload holds only the defaults of the extensions", async () => {
        const { dataSource, items } = createDataSource();
        await dataSource.read();
        expect(items.payloads[0]).toEqual({
          paging: {
            itemsPerPage: ITEMS_PER_PAGE,
            page: 1,
            totalItemsCount: GenericItems.length,
          },
          projections: [],
          sorts: [],
        });
        expect(items.payloads[0]).not.toHaveProperty("filters");
      });
      test("The items are the page served by the reader", async () => {
        const { dataSource, paginating } = createDataSource();
        await dataSource.read();
        expect(dataSource.items).toEqual(GenericItems.slice(0, ITEMS_PER_PAGE));
        expect(paginating.totalItemsCount).toBe(GenericItems.length);
        expect(paginating.lastPage).toBe(
          Math.ceil(GenericItems.length / ITEMS_PER_PAGE),
        );
        paginating.goToLastPage();
        await dataSource.read();
        expect(dataSource.items).toEqual(
          GenericItems.slice((paginating.lastPage - 1) * ITEMS_PER_PAGE),
        );
        expect(dataSource.items).toHaveLength(
          GenericItems.length % ITEMS_PER_PAGE || ITEMS_PER_PAGE,
        );
      });
      test("A second read after a page change sends the new page and keeps the rest", async () => {
        const { dataSource, filtering, items, paginating } = createDataSource();
        filtering.addFilter(adult);
        await dataSource.read();
        paginating.goToNextPage();
        await dataSource.read();
        expect(items.payloads).toHaveLength(2);
        expect(items.payloads[1].paging?.page).toBe(2);
        expect(items.payloads[1].filters).toEqual(items.payloads[0].filters);
      });
      test("A filter changed between two reads brings the page back to 1", async () => {
        const { dataSource, filtering, items, paginating } = createDataSource();
        filtering.addFilter(adult);
        await dataSource.read();
        paginating.goToPage(3);
        await dataSource.read();
        expect(items.payloads[1].paging?.page).toBe(3);
        const pageHandler = jest.fn();
        paginating.on("page", pageHandler);
        filtering.addFilter(single);
        await dataSource.read();
        expect(items.payloads[2].paging?.page).toBe(1);
        expect(pageHandler).toHaveBeenCalledTimes(1);
        expect(pageHandler).toHaveBeenCalledWith(1);
      });
      test("A null filter value is kept in the payload", async () => {
        const { dataSource, filtering, items } = createDataSource();
        filtering.addFilter(neverMarried);
        await dataSource.read();
        expect(items.payloads[0].filters).toEqual({
          filters: [{ field: "marriedOn", operator: FilterOperators.equal, value: null }],
          logic: FilterLogics.and,
        });
      });
      test("A FilterRange keeps the payload up to date through replaceFiltersOf", async () => {
        const { dataSource, filtering, items } = createDataSource();
        const range = new FilterRange<number>();
        range.on("change", (value) =>
          filtering.replaceFiltersOf("age", {
            field: "age",
            operator: FilterOperators.range,
            value,
          }),
        );
        range.min.setValue(30);
        await dataSource.read();
        range.max.setValue(40);
        range.max.setExclude(true);
        await dataSource.read();
        expect(items.payloads[0].filters).toEqual({
          filters: [
            {
              field: "age",
              operator: FilterOperators.range,
              value: { max: null, min: { exclude: false, value: 30 } },
            },
          ],
          logic: FilterLogics.and,
        });
        expect(items.payloads[1].filters).toEqual({
          filters: [
            {
              field: "age",
              operator: FilterOperators.range,
              value: {
                max: { exclude: true, value: 40 },
                min: { exclude: false, value: 30 },
              },
            },
          ],
          logic: FilterLogics.and,
        });
        expect(filtering.filters).toHaveLength(1);
        await range.dispose();
      });
      test("A SingleSortExtension sends one sort at most", async () => {
        const { dataSource, items, sorting } = createDataSource({
          singleSort: true,
        });
        sorting.addSort(byLastName);
        sorting.addSort(byAge);
        await dataSource.read();
        expect(items.payloads[0].sorts).toEqual([byAge]);
      });
    });

    describe("with fixed filters", () => {
      function createFixedDataSource() {
        const count = createCountReader<GenericItem>(GenericItems.length);
        const items = createItemsReader(GenericItems);
        const filtering = new FilterExtensionWithFixedFilters<GenericItem>(
          women,
          { groupsLogic: FilterLogics.and },
        );
        const paginating = new PaginationExtension<GenericItem>(
          count.reader,
          ITEMS_PER_PAGE,
        );
        const dataSource = new DataSource<GenericItem>(items.reader, [
          filtering,
          paginating,
        ]);
        return { count, dataSource, filtering, items, paginating };
      }

      test("Without user filters the payload holds exactly the fixed expression", async () => {
        const { count, dataSource, items } = createFixedDataSource();
        await dataSource.read();
        expect(items.payloads[0].filters).toBe(women);
        expect(count.payloads[0].filters).toBe(women);
      });
      test("With user filters the payload groups the fixed expression and the user list", async () => {
        const { dataSource, filtering, items } = createFixedDataSource();
        filtering.addFilter(adult);
        filtering.addFilter(single);
        filtering.setLogic(FilterLogics.or);
        await dataSource.read();
        const expected: FiltersExpression<GenericItem> = {
          groups: [
            women,
            { filters: [adult, single], logic: FilterLogics.or },
          ],
          logic: FilterLogics.and,
        };
        expect(items.payloads[0].filters).toEqual(expected);
      });
      test("Going from user filters to none and back changes the shape of the expression each time", async () => {
        const { dataSource, filtering, items } = createFixedDataSource();
        filtering.addFilter(adult);
        await dataSource.read();
        filtering.clearFilters();
        await dataSource.read();
        filtering.setFilters([single]);
        await dataSource.read();
        expect(items.payloads.map((a) => a.filters)).toEqual([
          { groups: [women, { filters: [adult], logic: FilterLogics.and }], logic: FilterLogics.and },
          women,
          { groups: [women, { filters: [single], logic: FilterLogics.and }], logic: FilterLogics.and },
        ]);
      });
    });

    describe("order of the extensions", () => {
      test("[filtering, pagination]: the count reader receives the filters", async () => {
        const count = createCountReader<GenericItem>(GenericItems.length);
        const items = createItemsReader(GenericItems);
        const filtering = new FilterExtension<GenericItem>();
        const paginating = new PaginationExtension<GenericItem>(
          count.reader,
          ITEMS_PER_PAGE,
        );
        const dataSource = new DataSource<GenericItem>(items.reader, [
          filtering,
          paginating,
        ]);
        filtering.addFilter(adult);
        await dataSource.read();
        expect(count.payloads[0].filters).toEqual({
          filters: [adult],
          logic: FilterLogics.and,
        });
        expect(items.payloads[0].filters).toEqual(count.payloads[0].filters);
      });
      test("[pagination, filtering]: the count reader does not receive the filters, the items reader does", async () => {
        const count = createCountReader<GenericItem>(GenericItems.length);
        const items = createItemsReader(GenericItems);
        const filtering = new FilterExtension<GenericItem>();
        const paginating = new PaginationExtension<GenericItem>(
          count.reader,
          ITEMS_PER_PAGE,
        );
        const dataSource = new DataSource<GenericItem>(items.reader, [
          paginating,
          filtering,
        ]);
        filtering.addFilter(adult);
        await dataSource.read();
        expect(count.payloads[0]).toEqual({});
        expect(items.payloads[0].filters).toEqual({
          filters: [adult],
          logic: FilterLogics.and,
        });
      });
      test("[pagination, filtering]: a filter change does not reset the page, the filters come after the hash", async () => {
        const count = createCountReader<GenericItem>(GenericItems.length);
        const items = createItemsReader(GenericItems);
        const filtering = new FilterExtension<GenericItem>();
        const paginating = new PaginationExtension<GenericItem>(
          count.reader,
          ITEMS_PER_PAGE,
        );
        const dataSource = new DataSource<GenericItem>(items.reader, [
          paginating,
          filtering,
        ]);
        await dataSource.read();
        paginating.goToPage(2);
        filtering.addFilter(adult);
        await dataSource.read();
        expect(items.payloads[1].paging?.page).toBe(2);
      });
    });

    describe("events during a read", () => {
      test("Raises isReading, totalItemsCount and items in order, with the data of the read", async () => {
        const { dataSource, paginating } = createDataSource();
        const events: unknown[] = [];
        dataSource.on("isReading", (value) => events.push(["isReading", value]));
        dataSource.on("items", (value) => events.push(["items", value.length]));
        paginating.on("totalItemsCount", (value) =>
          events.push(["totalItemsCount", value]),
        );
        await dataSource.read();
        expect(events).toEqual([
          ["isReading", true],
          ["totalItemsCount", GenericItems.length],
          ["items", ITEMS_PER_PAGE],
          ["isReading", false],
        ]);
      });
    });
  });
});
