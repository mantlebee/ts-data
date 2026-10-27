import { List } from "@mantlebee/ts-core";

/** Value object of a consumer: compared through `valueOf`. */
export class Money {
  public constructor(public readonly cents: number) {}
  public valueOf(): number {
    return this.cents;
  }
}

/**
 * Item whose fields are not primitives: a value object, a plain object and
 * a list, to test how the in-memory delegates compare them.
 */
export type Product = {
  id: number;
  price: Money;
  /** An object without a primitive `valueOf`: compared by reference. */
  supplier: { name: string };
  tags: List<string>;
};

export const Acme = { name: "Acme" };
export const Globex = { name: "Globex" };

export const Products: List<Product> = [
  { id: 1, price: new Money(1500), supplier: Acme, tags: ["Food", "Fresh"] },
  { id: 2, price: new Money(250), supplier: Globex, tags: ["Tools"] },
  { id: 3, price: new Money(999), supplier: Acme, tags: [] },
];
