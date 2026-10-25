import { List, Nullable } from "@mantlebee/ts-core";

import { GenericItem } from "./types";

/**
 * Creates a {@link GenericItem} from the few fields that differ, deriving the
 * others, so the list below stays readable.
 */
function item(
  id: number,
  firstName: string,
  lastName: string,
  gender: GenericItem["gender"],
  age: number,
  marriedOn: Nullable<string>,
): GenericItem {
  const username = `${firstName}${lastName}`.toLowerCase();
  return {
    age,
    email: `${firstName}.${lastName}@example.com`.toLowerCase(),
    firstName,
    gender,
    id,
    lastName,
    married: marriedOn !== null,
    marriedOn: marriedOn === null ? null : new Date(marriedOn),
    username,
  };
}

/**
 * Deterministic list of 24 items: fixed ids, names and dates, so a test can
 * rely on "item 3 is 52 years old" and on the order of the list.
 * Ages are spread from 16 to 71, 15 items are married, 11 are women.
 */
export const GenericItems: List<GenericItem> = [
  item(1, "Ut", "Consectetur", "M", 30, null),
  item(2, "Viverra", "Congue", "M", 49, "2001-06-23T00:00:00.000Z"),
  item(3, "Egestas", "Amet", "M", 52, "1998-09-12T00:00:00.000Z"),
  item(4, "Lorem", "Diam", "F", 20, null),
  item(5, "Praesent", "Congue", "F", 41, "2010-05-14T00:00:00.000Z"),
  item(6, "Mauris", "Sodales", "M", 16, null),
  item(7, "Aliquam", "Nunc", "F", 34, "2015-02-28T00:00:00.000Z"),
  item(8, "Dictum", "Lacinia", "M", 63, "1987-11-02T00:00:00.000Z"),
  item(9, "Sapien", "Diam", "F", 27, null),
  item(10, "Vitae", "Ornare", "M", 45, "2004-08-19T00:00:00.000Z"),
  item(11, "Pharetra", "Amet", "F", 58, "1992-03-07T00:00:00.000Z"),
  item(12, "Tempus", "Nulla", "M", 17, null),
  item(13, "Fermentum", "Lacinia", "F", 39, "2012-10-30T00:00:00.000Z"),
  item(14, "Rhoncus", "Sodales", "M", 71, "1979-01-15T00:00:00.000Z"),
  item(15, "Cursus", "Ornare", "F", 23, null),
  item(16, "Luctus", "Congue", "M", 36, "2013-07-04T00:00:00.000Z"),
  item(17, "Vehicula", "Nunc", "F", 50, "1999-12-24T00:00:00.000Z"),
  item(18, "Faucibus", "Diam", "M", 29, null),
  item(19, "Tincidunt", "Amet", "F", 44, "2006-04-11T00:00:00.000Z"),
  item(20, "Porttitor", "Nulla", "M", 61, "1990-09-09T00:00:00.000Z"),
  item(21, "Ultrices", "Lacinia", "F", 19, null),
  item(22, "Posuere", "Sodales", "M", 33, "2016-06-18T00:00:00.000Z"),
  item(23, "Gravida", "Ornare", "F", 55, "1995-02-02T00:00:00.000Z"),
  item(24, "Molestie", "Nunc", "M", 25, null),
];
