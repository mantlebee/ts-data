import { getDataSourcePlugin } from "./utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourcePlugin", () => {
      describe("models", () => {
        describe("After initialization", () => {
          it("'isEnabled' is true", () => {
            const plugin = getDataSourcePlugin();
            expect(plugin.isEnabled).toBeTruthy();
          });
        });
        describe("Enabling/disabling", () => {
          it("'isEnabled' is false after 'disable'", () => {
            const plugin = getDataSourcePlugin();
            plugin.disable();
            expect(plugin.isEnabled).toBeFalsy();
          });
          it("'isEnabled' is true after 'enable'", () => {
            const plugin = getDataSourcePlugin();
            plugin.enable();
            expect(plugin.isEnabled).toBeTruthy();
          });
        });
      });
    });
  });
});
