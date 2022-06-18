import { getPayload } from "../../../__tests__";
import { TO_PAGE } from "./constants";
import { getDataSourcePagination, totalCountReadDelegate } from "./utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourcePaginationPlugin", () => {
      describe("models", () => {
        describe("After initialization", () => {
          it("'currentPage' is 1", () => {
            const pagination = getDataSourcePagination();
            expect(pagination.currentPage).toBe(1);
          });
        });
        describe("Paginating", () => {
          it("'currentPage' after 'nextPage' is incremented by 1", () => {
            const pagination = getDataSourcePagination();
            pagination.goToPage(-1);
            const oldCurrentPage = pagination.currentPage;
            pagination.goNextPage();
            expect(pagination.currentPage).toBe(oldCurrentPage + 1);
          });
          it("'currentPage' after 'prevPage' is decremented by 1", () => {
            const pagination = getDataSourcePagination();
            pagination.goToPage(2);
            const oldCurrentPage = pagination.currentPage;
            pagination.goPrevPage();
            expect(pagination.currentPage).toBe(oldCurrentPage - 1);
          });
          it("'currentPage' after 'goToPage' is equal to given page", () => {
            const pagination = getDataSourcePagination();
            const toPage = TO_PAGE;
            pagination.goToPage(TO_PAGE);
            expect(pagination.currentPage).toBe(toPage);
          });
        });
        describe("Before read", () => {
          it("'totalItemsCount' is updated", async () => {
            const pagination = getDataSourcePagination();
            const payload = getPayload();
            const totalItemsCount = await totalCountReadDelegate(payload);
            await pagination.beforeRead(payload);
            expect(pagination.totalItemsCount).toBe(totalItemsCount);
          });
          it("'paylod' is updated", async () => {
            const pagination = getDataSourcePagination();
            pagination.goToPage(TO_PAGE);
            let payload = getPayload();
            payload = await pagination.beforeRead(payload);
            expect(payload.skip).toBe(10);
            expect(payload.top).toBe(10);
          });
        });
      });
    });
  });
});
