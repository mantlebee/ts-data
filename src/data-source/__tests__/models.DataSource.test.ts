import {
  DataSource,
  DataSourcePayload,
  FilterExtension,
  IDataSourceExtension,
  PaginationExtension,
  ProjectionExtension,
  SortExtension,
} from "@/data-source";
import { Filter, FilterLogics, FilterOperators, Sort } from "@/query-items";

type Item = { id: number; name: string };

const item1: Item = { id: 1, name: "one" };

const filter: Filter<Item> = {
  field: "id",
  operator: FilterOperators.equal,
  value: 1,
};
const sort: Sort<Item> = { field: "name", asc: true };

function createRecorder(label?: string, order?: string[]) {
  const payloads: DataSourcePayload<Item>[] = [];
  const extension: IDataSourceExtension<Item> = {
    dispose: async () => {},
    getItemsBefore: async (payload) => {
      if (label && order) order.push(label);
      payloads.push({ ...payload });
      return payload;
    },
    on: () => ({ dispose: async () => {} }),
  };
  return { extension, payloads };
}

describe("DataSource", () => {
  describe("named extensions", () => {
    test("Are exposed as filtering, paginating, projecting and sorting", () => {
      const filtering = new FilterExtension<Item>();
      const paginating = new PaginationExtension<Item>(async () => 0, 10);
      const projecting = new ProjectionExtension<Item>();
      const sorting = new SortExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], {
        filtering,
        paginating,
        projecting,
        sorting,
      });
      expect(dataSource.filtering).toBe(filtering);
      expect(dataSource.paginating).toBe(paginating);
      expect(dataSource.projecting).toBe(projecting);
      expect(dataSource.sorting).toBe(sorting);
    });
    test("Missing ones are undefined", () => {
      const filtering = new FilterExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], { filtering });
      expect(dataSource.filtering).toBe(filtering);
      expect(dataSource.paginating).toBeUndefined();
      expect(dataSource.projecting).toBeUndefined();
      expect(dataSource.sorting).toBeUndefined();
    });
    test("Works without options", async () => {
      const reader = jest.fn(async (_payload: DataSourcePayload<Item>) => [
        item1,
      ]);
      const dataSource = new DataSource<Item>(reader);
      expect(dataSource.filtering).toBeUndefined();
      expect(dataSource.paginating).toBeUndefined();
      expect(dataSource.projecting).toBeUndefined();
      expect(dataSource.sorting).toBeUndefined();
      await dataSource.read();
      expect(dataSource.items).toEqual([item1]);
      expect(reader).toHaveBeenCalledWith({});
    });
    test("Are disposed with the data source", async () => {
      const filtering = new FilterExtension<Item>();
      const spy = jest.spyOn(filtering, "dispose");
      const dataSource = new DataSource<Item>(async () => [], { filtering });
      await dataSource.dispose();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("execution order", () => {
    test("Filtering and sorting precede pagination, whatever the order of the keys in the options", async () => {
      const countReader = jest.fn(
        async (_payload: DataSourcePayload<Item>) => 50,
      );
      const filtering = new FilterExtension<Item>();
      const sorting = new SortExtension<Item>();
      const paginating = new PaginationExtension<Item>(countReader, 10);
      filtering.addFilter(filter);
      sorting.addSort(sort);
      const dataSource = new DataSource<Item>(async () => [item1], {
        paginating,
        sorting,
        filtering,
      });
      await dataSource.read();
      expect(countReader).toHaveBeenCalledTimes(1);
      const payload = countReader.mock.calls[0][0];
      expect(payload.filters).toEqual({
        filters: [filter],
        logic: FilterLogics.and,
      });
      expect(payload.sorts).toEqual([sort]);
    });
    test("Projecting precedes pagination", async () => {
      const countReader = jest.fn(
        async (_payload: DataSourcePayload<Item>) => 0,
      );
      const dataSource = new DataSource<Item>(async () => [], {
        paginating: new PaginationExtension<Item>(countReader, 10),
        projecting: new ProjectionExtension<Item>(),
      });
      await dataSource.read();
      expect(countReader.mock.calls[0][0].projections).toEqual([]);
    });
    test("Pagination precedes the further extensions, which already see the paging", async () => {
      const recorder = createRecorder();
      const filtering = new FilterExtension<Item>();
      const sorting = new SortExtension<Item>();
      const projecting = new ProjectionExtension<Item>();
      const paginating = new PaginationExtension<Item>(async () => 50, 10);
      filtering.addFilter(filter);
      const dataSource = new DataSource<Item>(async () => [item1], {
        extensions: [recorder.extension],
        paginating,
        projecting,
        sorting,
        filtering,
      });
      await dataSource.read();
      expect(recorder.payloads).toHaveLength(1);
      const payload = recorder.payloads[0];
      expect(payload.paging).toEqual({
        itemsPerPage: 10,
        page: 1,
        totalItemsCount: 50,
      });
      expect(payload.filters).toBeDefined();
      expect(payload.sorts).toEqual([]);
      expect(payload.projections).toEqual([]);
    });
    test("Further extensions run in array order", async () => {
      const order: string[] = [];
      const a = createRecorder("a", order);
      const b = createRecorder("b", order);
      const dataSource = new DataSource<Item>(async () => [], {
        extensions: [a.extension, b.extension],
        filtering: new FilterExtension<Item>(),
      });
      await dataSource.read();
      expect(order).toEqual(["a", "b"]);
    });
  });

  describe("getExtension", () => {
    test("Finds named extensions", () => {
      const filtering = new FilterExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], { filtering });
      expect(dataSource.getExtension(FilterExtension)).toBe(filtering);
      expect(dataSource.getExtension(SortExtension)).toBeNull();
    });
    test("Finds further extensions", () => {
      const projecting = new ProjectionExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], {
        extensions: [projecting],
      });
      expect(dataSource.getExtension(ProjectionExtension)).toBe(projecting);
    });
  });
});
