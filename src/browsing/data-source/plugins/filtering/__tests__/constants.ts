import { Filter, FilterOperations } from "@/browsing";
import { GenericItem } from "@/fake";

export const FILTER_EMAIL: Filter<GenericItem> = {
  field: "email",
  operation: FilterOperations.equal,
  value: "john.doe@generic.item"
};
export const FILTER_FIRSTNAME: Filter<GenericItem> = {
  field: "firstName",
  operation: FilterOperations.equal,
  value: "John"
};
export const FILTER_FIRSTNAME_ALT: Filter<GenericItem> = {
  field: "firstName",
  operation: FilterOperations.equal,
  value: "Jane"
};
export const FILTER_LASTNAME: Filter<GenericItem> = {
  field: "lastName",
  operation: FilterOperations.equal,
  value: "Doe"
};
