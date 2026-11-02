import { EventsDefinition, List, Subscribable } from "@mantlebee/ts-core";

import {
  createDataSource,
  DataSource,
  DataSourceExtensionsDefinition,
  DataSourcePayload,
  DataSourceReader,
  FilterExtension,
  FilterExtensionWithFixedFilters,
  IDataSource,
  IDataSourceExtension,
  IFilterExtension,
  IPaginationExtension,
  ISortExtension,
  PaginationExtension,
  ProjectionExtension,
  SingleSortExtension,
  SortExtension,
} from "@/data-source";
import { FilterLogics, FilterOperators } from "@/query-items";

type Item = { id: number; name: string };

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };

const reader: DataSourceReader<Item> = async () => [item1, item1, item2];
const countReader: DataSourceReader<Item, number> = async () => 3;

/** Records the order of the `getItemsBefore` hooks: every extension pushes its name. */
let calls: string[] = [];

/** Asks for distinct items and drops the duplicates the reader let through. */
class DistinctExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    calls.push("distinct");
    payload.distinct = true;
    return payload;
  }
  public async getItemsAfter(items: List<TItem>): Promise<List<TItem>> {
    return Array.from(new Set(items));
  }
}

/** A second custom extension, to check the insertion order of the keys. */
class AuditExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    calls.push("audit");
    return payload;
  }
}

type Stub = IDataSourceExtension<Item> & { dispose: jest.Mock };

/** An extension recording `name` when its `getItemsBefore` runs. */
function createStub(name: string): Stub {
  return {
    dispose: jest.fn(async () => {}),
    getItemsBefore: async (payload: DataSourcePayload<Item>) => {
      calls.push(name);
      return payload;
    },
    on: jest.fn(() => ({ dispose: async () => {} })),
  } as unknown as Stub;
}

/**
 * The four extensions of the package, each one spying its `getItemsBefore`
 * to record the call order under its key.
 */
function createKnown() {
  const filtering = new FilterExtension<Item>();
  const pagination = new PaginationExtension<Item>(countReader, 10);
  const projection = new ProjectionExtension<Item>();
  const sorting = new SortExtension<Item>();
  const spy = (key: string, extension: IDataSourceExtension<Item>) =>
    jest
      .spyOn(extension, "getItemsBefore")
      .mockImplementation(async (payload) => {
        calls.push(key);
        return payload;
      });
  spy("filtering", filtering);
  spy("pagination", pagination);
  spy("projection", projection);
  spy("sorting", sorting);
  return { filtering, pagination, projection, sorting };
}

/** `true` when `A` and `B` are the same type, checked at compile time. */
type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

describe("DataSource extensions by key", () => {
  beforeEach(() => {
    calls = [];
  });

  describe("runtime", () => {
    test("The keyed properties are the very instances given, custom keys included", () => {
      const { filtering, pagination, projection, sorting } = createKnown();
      const distinct = new DistinctExtension<Item>();
      const source = createDataSource(reader, {
        filtering,
        pagination,
        projection,
        sorting,
        distinct,
      });
      expect(source.filtering).toBe(filtering);
      expect(source.pagination).toBe(pagination);
      expect(source.projection).toBe(projection);
      expect(source.sorting).toBe(sorting);
      expect(source.distinct).toBe(distinct);
    });
    test("The hooks of the package run in the canonical order whatever the key order of the record", async () => {
      const { filtering, pagination, projection, sorting } = createKnown();
      const source = createDataSource(reader, {
        projection,
        pagination,
        sorting,
        filtering,
      });
      await source.read();
      expect(calls).toEqual([
        "filtering",
        "sorting",
        "pagination",
        "projection",
      ]);
    });
    test("The custom keys run after the keys of the package, in insertion order", async () => {
      const { filtering, pagination } = createKnown();
      const source = createDataSource(reader, {
        distinct: new DistinctExtension<Item>(),
        pagination,
        audit: new AuditExtension<Item>(),
        filtering,
      });
      await source.read();
      expect(calls).toEqual(["filtering", "pagination", "distinct", "audit"]);
      expect(source.items).toEqual([item1, item2]);
    });
    test("Swapping two custom keys in the record swaps their order", async () => {
      const { filtering } = createKnown();
      const source = createDataSource(reader, {
        audit: new AuditExtension<Item>(),
        filtering,
        distinct: new DistinctExtension<Item>(),
      });
      await source.read();
      expect(calls).toEqual(["filtering", "audit", "distinct"]);
    });
    test("A key set to undefined is absent: no property, nothing in the pipeline", async () => {
      const { filtering } = createKnown();
      const sorting: SortExtension<Item> | undefined = undefined;
      const distinct: DistinctExtension<Item> | undefined = undefined;
      const source = createDataSource(reader, { filtering, sorting, distinct });
      expect("filtering" in source).toBe(true);
      expect("sorting" in source).toBe(false);
      expect("distinct" in source).toBe(false);
      expect(source.sorting).toBeUndefined();
      expect(source.distinct).toBeUndefined();
      await source.read();
      expect(calls).toEqual(["filtering"]);
    });
    test("A key not given is absent", () => {
      const source = createDataSource(reader, {
        filtering: new FilterExtension<Item>(),
      });
      expect("pagination" in source).toBe(false);
      expect("projection" in source).toBe(false);
      expect("sorting" in source).toBe(false);
    });
    test("Without extensions no keyed property is set and the reader gets an empty payload", async () => {
      const payloads: DataSourcePayload<Item>[] = [];
      const source = createDataSource(
        async (payload: DataSourcePayload<Item>) => {
          payloads.push(payload);
          return [item1];
        },
        {},
      );
      expect("filtering" in source).toBe(false);
      await source.read();
      expect(payloads).toEqual([{}]);
      expect(new DataSource<Item>(reader).filtering).toBeUndefined();
    });
    test("The subclasses of the package fit their key", () => {
      const filtering = new FilterExtensionWithFixedFilters<Item>({
        filters: [{ field: "id", operator: FilterOperators.equal, value: 1 }],
        logic: FilterLogics.and,
      });
      const sorting = new SingleSortExtension<Item>();
      const source = createDataSource(reader, { filtering, sorting });
      expect(source.filtering).toBe(filtering);
      expect(source.sorting).toBe(sorting);
    });
    test("A custom implementation of an interface of the package fits its key and runs in its place", async () => {
      const filtering = createStub(
        "custom filtering",
      ) as unknown as IFilterExtension<Item>;
      const { pagination } = createKnown();
      const source = createDataSource(reader, { pagination, filtering });
      await source.read();
      expect(source.filtering).toBe(filtering);
      expect(calls).toEqual(["custom filtering", "pagination"]);
    });
    test("dispose disposes every extension, of the package or custom", async () => {
      const filtering = new FilterExtension<Item>();
      const disposeFiltering = jest.spyOn(filtering, "dispose");
      const distinct = new DistinctExtension<Item>();
      const disposeDistinct = jest.spyOn(distinct, "dispose");
      const stub = createStub("stub");
      const source = createDataSource(reader, { distinct, filtering, stub });
      await source.dispose();
      expect(disposeFiltering).toHaveBeenCalledTimes(1);
      expect(disposeDistinct).toHaveBeenCalledTimes(1);
      expect(stub.dispose).toHaveBeenCalledTimes(1);
    });
    test("The class runs the same pipeline and sets the custom keys too, untyped", async () => {
      const { filtering, pagination } = createKnown();
      const extensions: DataSourceExtensionsDefinition<Item> = {
        pagination,
        filtering,
        audit: new AuditExtension<Item>(),
      };
      const source = new DataSource<Item>(reader, extensions);
      await source.read();
      expect(source.filtering).toBe(filtering);
      expect(source.pagination).toBe(pagination);
      expect("audit" in source).toBe(true);
      expect(calls).toEqual(["filtering", "pagination", "audit"]);
    });
    test("The payload flows through the extensions of a source built by the factory", async () => {
      const payloads: DataSourcePayload<Item>[] = [];
      const recording: DataSourceReader<Item> = async (payload) => {
        payloads.push(payload);
        return [item1];
      };
      const source = createDataSource(recording, {
        filtering: new FilterExtension<Item>(),
        sorting: new SortExtension<Item>(),
      });
      source.filtering.addFilter({
        field: "id",
        operator: FilterOperators.equal,
        value: 1,
      });
      source.sorting.addSort({ field: "name", asc: true });
      await source.read();
      expect(payloads).toEqual([
        {
          filters: {
            filters: [
              { field: "id", operator: FilterOperators.equal, value: 1 },
            ],
            logic: FilterLogics.and,
          },
          sorts: [{ field: "name", asc: true }],
        },
      ]);
      expect(source.items).toEqual([item1]);
    });
  });

  describe("types", () => {
    const filtering = new FilterExtension<Item>();
    const pagination = new PaginationExtension<Item>(countReader, 10);
    const sorting = new SortExtension<Item>();
    const distinct = new DistinctExtension<Item>();

    test("createDataSource types every key of the record, with the type given", () => {
      const source = createDataSource(reader, {
        filtering,
        pagination,
        distinct,
      });
      const exactFiltering: IsExact<
        typeof source.filtering,
        FilterExtension<Item>
      > = true;
      const exactDistinct: IsExact<
        typeof source.distinct,
        DistinctExtension<Item>
      > = true;
      const byKeys: IDataSource<Item, "filtering" | "pagination"> = source;
      const byRecord: IDataSource<
        Item,
        { filtering: IFilterExtension<Item>; distinct: DistinctExtension<Item> }
      > = source;
      expect(byKeys).toBe(source);
      expect(byRecord).toBe(source);
      expect(exactFiltering && exactDistinct).toBe(true);
    });
    test("A union of keys of the package is a shorthand for the record of their interfaces", () => {
      const exact: IsExact<
        IDataSource<Item, "filtering" | "pagination">,
        IDataSource<
          Item,
          {
            filtering: IFilterExtension<Item>;
            pagination: IPaginationExtension<Item>;
          }
        >
      > = true;
      expect(exact).toBe(true);
    });
    test("The keys given are required, the keys of the package not given are optional and narrow", () => {
      const source: IDataSource<Item, "filtering" | "pagination"> =
        createDataSource(reader, { filtering, pagination });
      // Required: no narrowing needed.
      source.filtering.setLogic(FilterLogics.or);
      source.pagination.goToFirstPage();
      const required: IsExact<
        typeof source.filtering,
        IFilterExtension<Item>
      > = true;
      // Optional: `undefined` until narrowed.
      const optional: IsExact<
        typeof source.sorting,
        ISortExtension<Item> | undefined
      > = true;
      const unnarrowed = (): void => {
        // @ts-expect-error `sorting` is possibly undefined
        source.sorting.addSort({ field: "id", asc: true });
      };
      if (source.sorting) source.sorting.addSort({ field: "id", asc: true });
      if ("projection" in source && source.projection)
        source.projection.addProjection({ field: "id" });
      expect(unnarrowed).toThrow(TypeError);
      expect(required && optional).toBe(true);
      expect(source.sorting).toBeUndefined();
    });
    test("A custom key not in the record is not a property at all", () => {
      const source = createDataSource(reader, { filtering });
      // @ts-expect-error `distinct` does not exist on this source
      expect(source.distinct).toBeUndefined();
      // @ts-expect-error a source without `distinct` does not fit one asking for it
      const asked: IDataSource<Item, { distinct: DistinctExtension<Item> }> =
        source;
      expect(asked).toBe(source);
    });
    test("A custom key declared optional in a signature accepts sources with and without it", () => {
      type MaybeDistinct = IDataSource<
        Item,
        {
          filtering: IFilterExtension<Item>;
          distinct?: DistinctExtension<Item>;
        }
      >;
      const withDistinct: MaybeDistinct = createDataSource(reader, {
        filtering,
        distinct,
      });
      const without: MaybeDistinct = createDataSource(reader, { filtering });
      const optional: IsExact<
        MaybeDistinct["distinct"],
        DistinctExtension<Item> | undefined
      > = true;
      expect(withDistinct.distinct).toBe(distinct);
      expect(without.distinct).toBeUndefined();
      expect(optional).toBe(true);
    });
    test("A source with more extensions is assignable to a parameter asking for fewer, not the opposite", () => {
      const both: IDataSource<Item, "filtering" | "pagination"> =
        createDataSource(reader, { filtering, pagination });
      const one: IDataSource<Item, "filtering"> = both;
      const none: IDataSource<Item> = one;
      // @ts-expect-error a source guaranteeing nothing does not guarantee `filtering`
      const backToOne: IDataSource<Item, "filtering"> = none;
      // @ts-expect-error a source guaranteeing `filtering` does not guarantee `pagination`
      const backToBoth: IDataSource<Item, "filtering" | "pagination"> = one;
      // @ts-expect-error `sorting` is not among the guaranteed ones
      const other: IDataSource<Item, "sorting"> = both;
      expect([one, none, backToOne, backToBoth, other]).toEqual(
        Array(5).fill(both),
      );
    });
    test("The default guarantees nothing: every plain IDataSource<T> annotation keeps compiling", () => {
      const fromFactory: IDataSource<Item> = createDataSource(reader, {
        filtering,
        distinct,
      });
      const fromClass: IDataSource<Item> = new DataSource<Item>(reader, {
        filtering,
      });
      const empty: IDataSource<Item> = createDataSource(reader, {});
      expect(fromFactory.filtering).toBe(filtering);
      expect(fromClass.filtering).toBe(filtering);
      expect(empty.filtering).toBeUndefined();
    });
    test("A key whose value may be undefined is optional, not guaranteed", () => {
      const maybePagination: PaginationExtension<Item> | undefined =
        Math.random() < 2 ? pagination : undefined;
      const source = createDataSource(reader, {
        filtering,
        pagination: maybePagination,
      });
      const optional: IsExact<
        typeof source.pagination,
        PaginationExtension<Item> | undefined
      > = true;
      const one: IDataSource<Item, "filtering"> = source;
      // @ts-expect-error `pagination` may be undefined: not guaranteed
      const both: IDataSource<Item, "filtering" | "pagination"> = source;
      expect(one).toBe(both);
      expect(optional).toBe(true);
      // Given at runtime, the extension is exposed anyway.
      expect(source.pagination).toBe(pagination);
    });
    test("A consumer states what it needs in a signature", () => {
      const bindPager = (
        source: IDataSource<Item, "pagination">,
      ): IPaginationExtension<Item> => source.pagination;
      const source = createDataSource(reader, { pagination, sorting });
      expect(bindPager(source)).toBe(pagination);
      // @ts-expect-error a source without a guaranteed `pagination` does not fit
      bindPager(createDataSource(reader, { sorting }));
    });
    test("The record is checked: the keys of the package against their interface, every key against the extension contract", () => {
      // @ts-expect-error a sorting is not a filtering
      createDataSource(reader, { filtering: sorting });
      createDataSource(reader, {
        // @ts-expect-error a pagination of another item type
        pagination: new PaginationExtension<{ other: string }>(
          async () => 0,
          10,
        ),
      });
      // @ts-expect-error a custom key must hold an extension
      createDataSource(reader, { distinct: 1 });
      expect(true).toBe(true);
    });
  });
});
