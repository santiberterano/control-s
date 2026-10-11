import assert from "node:assert/strict";
import test from "node:test";

import { calcularPrecioRecurso } from "../app/proyectos/[id]/componentes/calculosRecursos.ts";

const recursos = [
  { tipo: "CON", codigo: "001", nombre: "Dólar", precio: 1000, formula: "=1000" },
  { tipo: "MDO", codigo: "001", nombre: "Oficial", precio: 0, formula: "=[DOLAR]*2" },
  { tipo: "INS", codigo: "HAO-001", nombre: "Cemento", precio: 0, formula: "=[DOLAR]*0.5" },
  { tipo: "INS", codigo: "HAO-002", nombre: "Hormigón", precio: 0, formula: "=[HAO-001]*3" },
];

test("conserva referencias existentes por nombre y tipo", () => {
  assert.equal(calcularPrecioRecurso(recursos[1], recursos), 2000);
});

test("calcula un insumo a partir de una constante existente", () => {
  assert.equal(calcularPrecioRecurso(recursos[2], recursos), 500);
});

test("resuelve dependencias entre códigos categorizados de insumos", () => {
  assert.equal(calcularPrecioRecurso(recursos[3], recursos), 1500);
});

test("mantiene la protección contra referencias circulares", () => {
  const circulares = [
    { tipo: "INS", codigo: "REV-001", nombre: "A", precio: 10, formula: "=[REV-002]" },
    { tipo: "INS", codigo: "REV-002", nombre: "B", precio: 20, formula: "=[REV-001]" },
  ];
  assert.equal(calcularPrecioRecurso(circulares[0], circulares), null);
});

test("acepta registros antiguos que todavía no tienen fórmula", () => {
  const legado = { tipo: "INS", codigo: "PIN-001", nombre: "Pintura", precio: 750 };
  assert.equal(calcularPrecioRecurso(legado, [legado]), 750);
});
