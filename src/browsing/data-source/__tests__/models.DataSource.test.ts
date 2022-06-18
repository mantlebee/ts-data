import { BrowseItemsPayload } from "@/browsing";
import { GenericItem } from "@/fake";

import { IDataSourcePlugin } from "../interfaces";
import { DataSourcePlugin } from "../models";
import { getDataSource } from "./utils";

class FakeDataSourcePlugin
  extends DataSourcePlugin<GenericItem>
  implements IDataSourcePlugin<GenericItem> {
  public check = false;
  public beforeRead(payload: BrowseItemsPayload<GenericItem>) {
    this.check = true;
    return Promise.resolve(payload);
  }
}

describe("DataSource", () => {
  describe("models", () => {
    describe("DataSource", () => {
      describe("After Initialization", () => {
        it("'isPristine' is true", () => {
          const dataSource = getDataSource();
          expect(dataSource.isPristine).toBeTruthy();
        });
      });
      describe("Before read", () => {
        it("'isReading' is false", () => {
          const dataSource = getDataSource();
          expect(dataSource.isReading).toBeFalsy();
        });
        describe("Plugins", () => {
          it("Plugins enabled are invoked", async () => {
            const plugin = new FakeDataSourcePlugin();
            const dataSource = getDataSource(0, [plugin]);
            plugin.enable();
            await dataSource.read();
            expect(plugin.check).toBeTruthy();
          });
          it("Plugins disabled are not invoked", async () => {
            const plugin = new FakeDataSourcePlugin();
            const dataSource = getDataSource(0, [plugin]);
            plugin.disable();
            await dataSource.read();
            expect(plugin.check).toBeFalsy();
          });
        });
      });
      describe("While reading", () => {
        it("'isReading' is true", () => {
          const dataSource = getDataSource(1000);
          dataSource.read();
          expect(dataSource.isReading).toBeTruthy();
        });
      });
      describe("After read", () => {
        it("'isPristine' is false", async () => {
          const dataSource = getDataSource();
          await dataSource.read();
          expect(dataSource.isPristine).toBeFalsy();
        });
        it("'isReading' is false", async () => {
          const dataSource = getDataSource();
          await dataSource.read();
          expect(dataSource.isReading).toBeFalsy();
        });
        it("'items' is equal to the read result", async () => {
          const dataSource = getDataSource();
          const items = await dataSource.read();
          expect(dataSource.items).toEqual(items);
        });
      });
    });
  });
});
