import { EventsDefinition, List, Subscribable } from "@mantlebee/ts-core";

import {
  createDataSource,
  DataSourcePayload,
  DataSourceReader,
  DefinedCapabilities,
  FilterExtension,
  IDataSource,
  IDataSourceExtension,
  PaginationExtension,
} from "@/data-source";

type Item = { id: number; name: string };

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };

const reader: DataSourceReader<Item> = async () => [item1, item1, item2];
const countReader: DataSourceReader<Item, number> = async () => 3;

/** Records the order of the hooks: every extension pushes its name. */
const calls: string[] = [];

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

// The augmentation a consumer writes against "@mantlebee/ts-data": here the
// barrel of the folder, which re-exports the interface the same way.
declare module "@/data-source" {
  interface DataSourceCapabilities<TItem> {
    audit: AuditExtension<TItem>;
    distinct: DistinctExtension<TItem>;
  }
}

/** `true` when `A` and `B` are the same type, checked at compile time. */
type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

function createKnown() {
  const filtering = new FilterExtension<Item>();
  const pagination = new PaginationExtension<Item>(countReader, 10);
  jest.spyOn(filtering, "getItemsBefore").mockImplementation(async (a) => {
    calls.push("filtering");
    return a;
  });
  jest.spyOn(pagination, "getItemsBefore").mockImplementation(async (a) => {
    calls.push("pagination");
    return a;
  });
  return { filtering, pagination };
}

function createOther(): IDataSourceExtension<Item> {
  return {
    dispose: async () => {},
    on: jest.fn(() => ({ dispose: async () => {} })),
    getItemsBefore: async (payload: DataSourcePayload<Item>) => {
      calls.push("other");
      return payload;
    },
  } as unknown as IDataSourceExtension<Item>;
}

describe("DataSource capabilities augmented by the consumer", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  test("An augmented key is a capability of the type and a keyed property", () => {
    const { filtering } = createKnown();
    const distinct = new DistinctExtension<Item>();
    const extensions = { filtering, distinct };
    const source = createDataSource(reader, extensions);
    const pinned: IDataSource<Item, "filtering" | "distinct"> = source;
    const exact: IsExact<
      DefinedCapabilities<typeof extensions>,
      "filtering" | "distinct"
    > = true;
    const typed: IsExact<
      typeof source.distinct,
      DistinctExtension<Item>
    > = true;
    expect(pinned.distinct).toBe(distinct);
    expect(source.filtering).toBe(filtering);
    expect("distinct" in source).toBe(true);
    expect(exact && typed).toBe(true);
  });
  test("An augmented key not given is optional and absent", () => {
    const source = createDataSource(reader, {
      filtering: new FilterExtension<Item>(),
    });
    const unnarrowed = (): void => {
      // @ts-expect-error `distinct` is possibly undefined
      void source.distinct.getItemsAfter([]);
    };
    expect(unnarrowed).toThrow(TypeError);
    expect("distinct" in source).toBe(false);
    expect(source.distinct).toBeUndefined();
    // @ts-expect-error a source without `distinct` does not guarantee it
    const guaranteed: IDataSource<Item, "distinct"> = source;
    expect(guaranteed).toBe(source);
  });
  test("The augmented keys run after the known ones and after the others, in insertion order", async () => {
    const { filtering, pagination } = createKnown();
    const source = createDataSource(
      reader,
      {
        distinct: new DistinctExtension<Item>(),
        pagination,
        audit: new AuditExtension<Item>(),
        filtering,
      },
      [createOther()],
    );
    await source.read();
    expect(calls).toEqual([
      "filtering",
      "pagination",
      "other",
      "distinct",
      "audit",
    ]);
    expect(source.items).toEqual([item1, item2]);
  });
  test("Swapping the augmented keys in the record swaps their order", async () => {
    const { filtering } = createKnown();
    const source = createDataSource(reader, {
      audit: new AuditExtension<Item>(),
      filtering,
      distinct: new DistinctExtension<Item>(),
    });
    await source.read();
    expect(calls).toEqual(["filtering", "audit", "distinct"]);
  });
  test("getExtension and dispose cover the augmented extensions too", async () => {
    const distinct = new DistinctExtension<Item>();
    const dispose = jest.spyOn(distinct, "dispose");
    const source = createDataSource(reader, { distinct });
    expect(source.getExtension(DistinctExtension)).toBe(distinct);
    await source.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  test("An augmented key is checked against its type", () => {
    // @ts-expect-error an AuditExtension is not a DistinctExtension
    createDataSource(reader, { distinct: new AuditExtension<Item>() });
    expect(true).toBe(true);
  });
});
