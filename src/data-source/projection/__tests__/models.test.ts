import { Projection } from "@/query-items";

import { DataSourcePayload } from "../../types";
import { ProjectionExtension } from "../models";

type Item = { active: boolean; age: number; name: string };

const activeProjection: Projection<Item> = { field: "active" };
const ageProjection: Projection<Item> = { field: "age" };
const nameProjection: Projection<Item> = { field: "name" };

describe("DataSource", () => {
  describe("extensions", () => {
    describe("projection", () => {
      describe("ProjectionExtension", () => {
        beforeEach(() => {
          jest.useFakeTimers();
        });
        afterEach(() => {
          jest.useRealTimers();
        });

        describe("hasProjections", () => {
          test("Is false with no projections", () => {
            const extension = new ProjectionExtension<Item>();
            expect(extension.hasProjections).toBe(false);
          });
          test("Is true with one projection", () => {
            const extension = new ProjectionExtension<Item>();
            extension.addProjection(nameProjection);
            expect(extension.hasProjections).toBe(true);
          });
          test("Is true with two projections", () => {
            const extension = new ProjectionExtension<Item>();
            extension.addProjection(nameProjection);
            extension.addProjection(ageProjection);
            expect(extension.hasProjections).toBe(true);
          });
        });

        describe("addProjection", () => {
          test("Appends the projection and raises addProjection with the projection and the projections", () => {
            const extension = new ProjectionExtension<Item>();
            const handler = jest.fn();
            extension.on("addProjection", handler);
            extension.addProjection(nameProjection);
            extension.addProjection(ageProjection);
            expect(extension.projections).toEqual([
              nameProjection,
              ageProjection,
            ]);
            expect(handler).toHaveBeenCalledTimes(2);
            expect(handler).toHaveBeenNthCalledWith(1, nameProjection, [
              nameProjection,
            ]);
            expect(handler).toHaveBeenNthCalledWith(2, ageProjection, [
              nameProjection,
              ageProjection,
            ]);
          });
          test("Ignores a projection on a field already projected: no change, no addProjection event", () => {
            const extension = new ProjectionExtension<Item>();
            extension.addProjection(nameProjection);
            const handler = jest.fn();
            extension.on("addProjection", handler);
            extension.addProjection({ field: "name" });
            expect(extension.projections).toEqual([nameProjection]);
            expect(handler).not.toHaveBeenCalled();
          });
          test("Does not schedule projectionsChange when the projection is ignored", () => {
            const extension = new ProjectionExtension<Item>();
            extension.setProjections([nameProjection]);
            jest.advanceTimersByTime(100);
            const handler = jest.fn();
            extension.on("projectionsChange", handler);
            extension.addProjection({ field: "name" });
            jest.advanceTimersByTime(1000);
            expect(handler).not.toHaveBeenCalled();
          });
        });

        describe("removeProjection", () => {
          test("Removes the projection of the field and raises removeProjection with the field and the projections", () => {
            const extension = new ProjectionExtension<Item>();
            extension.setProjections([nameProjection, ageProjection]);
            const handler = jest.fn();
            extension.on("removeProjection", handler);
            extension.removeProjection("name");
            expect(extension.projections).toEqual([ageProjection]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith("name", [ageProjection]);
          });
          test("Leaves the projections untouched if the field is not projected", () => {
            const extension = new ProjectionExtension<Item>();
            extension.setProjections([nameProjection]);
            extension.removeProjection("age");
            expect(extension.projections).toEqual([nameProjection]);
          });
        });

        describe("setProjections", () => {
          test("Replaces every projection and raises setProjections", () => {
            const extension = new ProjectionExtension<Item>();
            extension.addProjection(activeProjection);
            const handler = jest.fn();
            extension.on("setProjections", handler);
            extension.setProjections([nameProjection, ageProjection]);
            expect(extension.projections).toEqual([
              nameProjection,
              ageProjection,
            ]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([
              nameProjection,
              ageProjection,
            ]);
          });
        });

        describe("clearProjections", () => {
          test("Empties the projections and raises clearProjections without arguments", () => {
            const extension = new ProjectionExtension<Item>();
            extension.setProjections([nameProjection, ageProjection]);
            const handler = jest.fn();
            extension.on("clearProjections", handler);
            extension.clearProjections();
            expect(extension.projections).toEqual([]);
            expect(extension.hasProjections).toBe(false);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith();
          });
        });

        describe("projectionsChange", () => {
          test("Is raised once, after the default delay, following several quick mutations", () => {
            const extension = new ProjectionExtension<Item>();
            const handler = jest.fn();
            extension.on("projectionsChange", handler);
            extension.addProjection(nameProjection);
            extension.addProjection(ageProjection);
            extension.removeProjection("name");
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(99);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([ageProjection], true);
          });
          test("Is raised with hasProjections false after clearProjections", () => {
            const extension = new ProjectionExtension<Item>();
            const handler = jest.fn();
            extension.on("projectionsChange", handler);
            extension.clearProjections();
            jest.advanceTimersByTime(100);
            expect(handler).toHaveBeenCalledWith([], false);
          });
          test("Respects the changeDelay option", () => {
            const extension = new ProjectionExtension<Item>({
              changeDelay: 400,
            });
            const handler = jest.fn();
            extension.on("projectionsChange", handler);
            extension.addProjection(nameProjection);
            jest.advanceTimersByTime(399);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
          });
          test("Is not raised if the extension is disposed before the delay", async () => {
            const extension = new ProjectionExtension<Item>();
            const handler = jest.fn();
            extension.on("projectionsChange", handler);
            extension.addProjection(nameProjection);
            await extension.dispose();
            jest.advanceTimersByTime(1000);
            expect(handler).not.toHaveBeenCalled();
          });
        });

        describe("getItemsBefore", () => {
          test("Sets an empty list of projections when there are no projections", async () => {
            const extension = new ProjectionExtension<Item>();
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.projections).toEqual([]);
          });
          test("Sets the projections in the payload", async () => {
            const extension = new ProjectionExtension<Item>();
            extension.setProjections([nameProjection, ageProjection]);
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.projections).toEqual([nameProjection, ageProjection]);
          });
        });
      });
    });
  });
});
