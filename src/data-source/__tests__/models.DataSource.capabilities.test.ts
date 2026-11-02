import { EventsDefinition, List, Subscribable } from "@mantlebee/ts-core";

import {
  createDataSource,
  DataSource,
  DataSourcePayload,
  DataSourceReader,
  DefinedCapabilities,
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

const reader: DataSourceReader<Item> = async () => [item1, item2];
const countReader: DataSourceReader<Item, number> = async () => 2;

type Stub = IDataSourceExtension<Item> & {
  dispose: jest.Mock;
  on: jest.Mock;
};

function createStub(hooks: Partial<IDataSourceExtension<Item>> = {}): Stub {
  return {
    dispose: jest.fn(async () => {}),
    on: jest.fn(() => ({ dispose: async () => {} })),
    ...hooks,
  } as Stub;
}

/**
 * The four extensions of the package, each one spying its `getItemsBefore`
 * to record the call order under its key.
 */
function createKeyed(calls: List<string>) {
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

/** A custom extension with a class of its own, for `getExtension`. */
class OtherExtension
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<Item> {}

/** Records `name` in `calls` when its `getItemsBefore` runs. */
function createRecordingStub(name: string, calls: List<string>): Stub {
  return createStub({
    getItemsBefore: async (payload) => {
      calls.push(name);
      return payload;
    },
  });
}

/** `true` when `A` and `B` are the same type, checked at compile time. */
type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

describe("DataSource capabilities", () => {
  describe("the record form", () => {
    test("The keyed properties are the very instances given", () => {
      const { filtering, pagination, projection, sorting } = createKeyed([]);
      const source = createDataSource(reader, {
        filtering,
        pagination,
        projection,
        sorting,
      });
      expect(source.filtering).toBe(filtering);
      expect(source.pagination).toBe(pagination);
      expect(source.projection).toBe(projection);
      expect(source.sorting).toBe(sorting);
    });
    test("The hooks run in the canonical order whatever the key order of the record", async () => {
      const calls: string[] = [];
      const { filtering, pagination, projection, sorting } = createKeyed(calls);
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
    test("The others run after the known ones, in array order", async () => {
      const calls: string[] = [];
      const { filtering, pagination } = createKeyed(calls);
      const source = createDataSource(reader, { pagination, filtering }, [
        createRecordingStub("other A", calls),
        createRecordingStub("other B", calls),
      ]);
      await source.read();
      expect(calls).toEqual(["filtering", "pagination", "other A", "other B"]);
    });
    test("A key set to undefined is absent: no property, nothing in the pipeline", () => {
      const filtering = new FilterExtension<Item>();
      const sorting: SortExtension<Item> | undefined = undefined;
      const source = createDataSource(reader, { filtering, sorting });
      expect("filtering" in source).toBe(true);
      expect("sorting" in source).toBe(false);
      expect(source.sorting).toBeUndefined();
      expect(source.getExtension(SortExtension)).toBeNull();
    });
    test("A key not given is absent", () => {
      const source = createDataSource(reader, {
        filtering: new FilterExtension<Item>(),
      });
      expect("pagination" in source).toBe(false);
      expect("projection" in source).toBe(false);
      expect("sorting" in source).toBe(false);
    });
    test("Without extensions no keyed property is set", () => {
      const source = createDataSource(reader, {});
      expect("filtering" in source).toBe(false);
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
    test("A custom implementation of the interface fits its key", async () => {
      const calls: string[] = [];
      const filtering = createRecordingStub(
        "custom filtering",
        calls,
      ) as unknown as IFilterExtension<Item>;
      const { pagination } = createKeyed(calls);
      const source = createDataSource(reader, { pagination, filtering });
      await source.read();
      expect(source.filtering).toBe(filtering);
      expect(calls).toEqual(["custom filtering", "pagination"]);
    });
    test("getExtension still finds a keyed extension and one of the others", () => {
      const filtering = new FilterExtension<Item>();
      const other = new OtherExtension();
      const source = createDataSource(reader, { filtering }, [other]);
      expect(source.getExtension<FilterExtension<Item>>(FilterExtension)).toBe(
        filtering,
      );
      expect(source.getExtension(OtherExtension)).toBe(other);
      expect(source.getExtension(PaginationExtension)).toBeNull();
    });
    test("dispose disposes every extension, keyed or not", async () => {
      const filtering = new FilterExtension<Item>();
      const sorting = new SortExtension<Item>();
      const disposeFiltering = jest.spyOn(filtering, "dispose");
      const disposeSorting = jest.spyOn(sorting, "dispose");
      const other = createStub();
      const source = createDataSource(reader, { sorting, filtering }, [other]);
      await source.dispose();
      expect(disposeFiltering).toHaveBeenCalledTimes(1);
      expect(disposeSorting).toHaveBeenCalledTimes(1);
      expect(other.dispose).toHaveBeenCalledTimes(1);
    });
    test("The class accepts the record too and runs the same pipeline", async () => {
      const calls: string[] = [];
      const { filtering, pagination } = createKeyed(calls);
      const source = new DataSource<Item>(reader, { pagination, filtering }, [
        createRecordingStub("other", calls),
      ]);
      await source.read();
      expect(source.filtering).toBe(filtering);
      expect(source.pagination).toBe(pagination);
      expect(calls).toEqual(["filtering", "pagination", "other"]);
    });
  });

  describe("the list form (deprecated)", () => {
    test("The keyed properties are filled by instanceof on the classes of the package", () => {
      const filtering = new FilterExtension<Item>();
      const pagination = new PaginationExtension<Item>(countReader, 10);
      const projection = new ProjectionExtension<Item>();
      const sorting = new SortExtension<Item>();
      const source = new DataSource<Item>(reader, [
        createStub(),
        projection,
        sorting,
        pagination,
        filtering,
      ]);
      expect(source.filtering).toBe(filtering);
      expect(source.pagination).toBe(pagination);
      expect(source.projection).toBe(projection);
      expect(source.sorting).toBe(sorting);
    });
    test("The subclasses of the package fill the key of their base class", () => {
      const filtering = new FilterExtensionWithFixedFilters<Item>({
        filters: [{ field: "id", operator: FilterOperators.equal, value: 1 }],
        logic: FilterLogics.and,
      });
      const sorting = new SingleSortExtension<Item>();
      const source = new DataSource<Item>(reader, [sorting, filtering]);
      expect(source.filtering).toBe(filtering);
      expect(source.sorting).toBe(sorting);
      expect("pagination" in source).toBe(false);
    });
    test("The first instance wins, as in getExtension", () => {
      const first = new FilterExtension<Item>();
      const second = new FilterExtension<Item>();
      const source = new DataSource<Item>(reader, [first, second]);
      expect(source.filtering).toBe(first);
      expect(source.getExtension(FilterExtension)).toBe(first);
    });
    test("A custom extension in the list sets no key and the missing keys are absent", () => {
      const source = new DataSource<Item>(reader, [createStub()]);
      expect("filtering" in source).toBe(false);
      expect("pagination" in source).toBe(false);
      expect("projection" in source).toBe(false);
      expect("sorting" in source).toBe(false);
    });
    test("The list keeps its order and the others follow it", async () => {
      const calls: string[] = [];
      const { filtering, pagination } = createKeyed(calls);
      const source = new DataSource<Item>(
        reader,
        [pagination, createRecordingStub("custom", calls), filtering],
        [createRecordingStub("other", calls)],
      );
      await source.read();
      expect(calls).toEqual(["pagination", "custom", "filtering", "other"]);
    });
  });

  describe("types", () => {
    const filtering = new FilterExtension<Item>();
    const pagination = new PaginationExtension<Item>(countReader, 10);
    const sorting = new SortExtension<Item>();

    test("createDataSource infers the capabilities from the keys of the record", () => {
      const extensions = { filtering, pagination };
      const source = createDataSource(reader, extensions);
      const pinned: IDataSource<Item, "filtering" | "pagination"> = source;
      const exact: IsExact<
        DefinedCapabilities<typeof extensions>,
        "filtering" | "pagination"
      > = true;
      expect(pinned).toBe(source);
      expect(exact).toBe(true);
    });
    test("The declared capabilities are required, the others are optional and narrow", () => {
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
      expect(unnarrowed).toThrow(TypeError);
      if ("projection" in source && source.projection)
        source.projection.addProjection({ field: "id" });
      expect(required && optional).toBe(true);
      expect(source.sorting).toBeUndefined();
    });
    test("A source with more capabilities is assignable to a parameter asking for fewer, not the opposite", () => {
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
    test("The default never guarantees nothing: every existing annotation keeps compiling", () => {
      const fromList: IDataSource<Item> = new DataSource<Item>(reader, [
        filtering,
      ]);
      const fromRecord: IDataSource<Item> = createDataSource(reader, {
        filtering,
      });
      const fromClass: IDataSource<Item> = new DataSource<Item>(reader);
      const exact: IsExact<IDataSource<Item>, IDataSource<Item, never>> = true;
      expect(fromList.filtering).toBe(filtering);
      expect(fromRecord.filtering).toBe(filtering);
      expect(fromClass.filtering).toBeUndefined();
      expect(exact).toBe(true);
    });
    test("A key whose value may be undefined is not a capability", () => {
      const maybePagination: PaginationExtension<Item> | undefined =
        Math.random() < 2 ? pagination : undefined;
      const extensions = { filtering, pagination: maybePagination };
      const source = createDataSource(reader, extensions);
      const one: IDataSource<Item, "filtering"> = source;
      // @ts-expect-error `pagination` may be undefined: not guaranteed
      const both: IDataSource<Item, "filtering" | "pagination"> = source;
      const exact: IsExact<
        DefinedCapabilities<typeof extensions>,
        "filtering"
      > = true;
      const optionalKey: IsExact<
        DefinedCapabilities<{ sorting?: SortExtension<Item> }>,
        never
      > = true;
      const none: IsExact<DefinedCapabilities<{}>, never> = true;
      expect(one).toBe(both);
      expect(exact && optionalKey && none).toBe(true);
      // Given at runtime, the extension is exposed anyway.
      expect(source.pagination).toBe(pagination);
    });
    test("The class states the capabilities written by hand", () => {
      const source: IDataSource<Item, "filtering" | "sorting"> = new DataSource<
        Item,
        "filtering" | "sorting"
      >(reader, { filtering, sorting });
      source.filtering.setLogic(FilterLogics.and);
      source.sorting.clearSorts();
      // @ts-expect-error the class guarantees nothing by default
      const unguaranteed: IDataSource<Item, "filtering"> = new DataSource<Item>(
        reader,
        { filtering },
      );
      expect(unguaranteed.filtering).toBe(filtering);
    });
    test("The record is checked against the interfaces", () => {
      // @ts-expect-error a sorting is not a filtering
      createDataSource(reader, { filtering: sorting });
      createDataSource(reader, {
        // @ts-expect-error a pagination of another item type
        pagination: new PaginationExtension<{ other: string }>(
          async () => 0,
          10,
        ),
      });
      expect(true).toBe(true);
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
    test("The payload still flows through a source built by the factory", async () => {
      const payloads: DataSourcePayload<Item>[] = [];
      const recording: DataSourceReader<Item> = async (payload) => {
        payloads.push(payload);
        return [item1];
      };
      const source = createDataSource(recording, { filtering, sorting });
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
});
