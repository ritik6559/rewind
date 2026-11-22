import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDiscount, formatPrice, subtotalCents } from "./cart.ts";

const items = [
  { name: "pen", priceCents: 250, quantity: 4 },
  { name: "notebook", priceCents: 1200, quantity: 1 },
];

test("subtotal adds price times quantity", () => {
  assert.equal(subtotalCents(items), 2200);
});

test("a 10% discount takes a tenth off", () => {
  assert.equal(applyDiscount(2200, 10), 1980);
});

test("a 0% discount changes nothing", () => {
  assert.equal(applyDiscount(2200, 0), 2200);
});

test("prices are shown in dollars", () => {
  assert.equal(formatPrice(1980), "$19.80");
});
