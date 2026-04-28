export * from "./generated/api";
// Note: types in ./generated/types/ are intentionally NOT re-exported here.
// They duplicate the names of zod schemas in ./generated/api (e.g. when an
// operation has both path + query params), causing TS2308 collisions.
// Consumers needing the inferred TS types should use `z.infer<typeof X>`
// against the schemas exported above.
