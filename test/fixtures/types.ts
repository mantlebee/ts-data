import { Nullable } from "@mantlebee/ts-core";

/**
 * Item used by the tests: a person with fields of every kind a filter can
 * target (number, string, boolean, nullable date).
 */
export type GenericItem = {
  age: number;
  email: string;
  firstName: string;
  gender: "F" | "M";
  id: number;
  lastName: string;
  married: boolean;
  /** `null` when not married. */
  marriedOn: Nullable<Date>;
  username: string;
};
