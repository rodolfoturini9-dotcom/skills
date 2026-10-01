import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const medications = JSON.parse(fs.readFileSync(new URL("../app/medications.json", import.meta.url), "utf8"));

test("preserves the complete medication workbook base", () => {
  assert.equal(medications.length, 95);
  assert.equal(new Set(medications.map((item) => item.id)).size, 95);
  assert.equal(new Set(medications.map((item) => item.name.toLocaleLowerCase("pt-BR"))).size, 95);
  assert.ok(medications.every((item) => item.name && item.text));
});

test("every weight-based item has a usable maximum and concentration", () => {
  const calculated = medications.filter((item) => item.weightBased);
  assert.equal(calculated.length, 12);
  assert.ok(calculated.every((item) => item.maxDose > 0 && item.concentration > 0));
  assert.ok(calculated.every((item) => ["mcg/kg/min", "mcg/kg/h"].includes(item.formula)));
});

test("dobutamine example produces requested and maximum infusion rates", () => {
  const dobutamine = medications.find((item) => item.name === "Dobutamina");
  assert.ok(dobutamine);
  const desiredFlow = (5 * 70 * 60) / dobutamine.concentration;
  const maximumFlow = (dobutamine.maxDose * 70 * 60) / dobutamine.concentration;
  assert.equal(desiredFlow, 10.5);
  assert.equal(maximumFlow, 21);
});

test("generated prescription source uses the requested operational wording", () => {
  const source = fs.readFileSync(new URL("../app/icu/App.tsx", import.meta.url), "utf8");
  assert.match(source, /# Dose prescrita:/);
  assert.match(source, /Faixa cadastrada:/);
  assert.doesNotMatch(source, /Programar \$\{formatDecimal\(flow\)\}/);
});
