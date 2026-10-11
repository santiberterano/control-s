import assert from "node:assert/strict";
import test from "node:test";

import {
  calcularCostoApu,
  cantidadComponente,
  creariaCiclo,
  explotarApu,
  formulaCantidadValida,
  proximoCodigoApu,
} from "../app/proyectos/[id]/componentes/apu.ts";

const recursos = [
  { id: 1, tipo: "INS", codigo: "HAO-001", nombre: "Cemento", unidad: "kg", precio: 10 },
  { id: 2, tipo: "MDO", codigo: "001", nombre: "Oficial", unidad: "h", precio: 100 },
];

test("genera correlativos independientes por familia sin reutilizar códigos", () => {
  const familia = { id: 7, nombre: "Revoques", prefijo: "REV", ultimoCorrelativo: 1, creado: "", modificado: "" };
  const existentes = [{ id: 1, familiaId: 7, codigo: "REV-002", descripcion: "Existente", unidad: "m2", componentes: [], modificado: "", orden: 0 }];
  assert.deepEqual(proximoCodigoApu(familia, existentes), { codigo: "REV-003", correlativo: 3 });
});

test("el próximo código no modifica APU existentes sin familia", () => {
  const familia = { id: 8, nombre: "Pinturas", prefijo: "PIN", ultimoCorrelativo: 0, creado: "", modificado: "" };
  const legado = { id: 2, codigo: "APU-VIEJO", descripcion: "Legado", unidad: "u", componentes: [], modificado: "", orden: 0 };
  assert.deepEqual(proximoCodigoApu(familia, [legado]), { codigo: "PIN-001", correlativo: 1 });
  assert.equal(legado.codigo, "APU-VIEJO");
  assert.equal(legado.familiaId, undefined);
});

const apus = [
  {
    id: 10, codigo: "APU-010", descripcion: "Mortero", unidad: "m3", modificado: "", orden: 0,
    componentes: [
      { id: 101, tipo: "INS", recursoId: 1, cantidad: 5, formulaCantidad: "=2+3", factor: 1, orden: 0 },
      { id: 102, tipo: "MDO", recursoId: 2, cantidad: 2, formulaCantidad: "=2", factor: 1, orden: 1 },
    ],
  },
  {
    id: 20, codigo: "APU-020", descripcion: "Muro", unidad: "m2", modificado: "", orden: 1,
    componentes: [
      { id: 201, tipo: "APU", recursoId: 10, cantidad: 3, formulaCantidad: "=3", factor: 1, orden: 0, modo: "encapsulado" },
    ],
  },
  {
    id: 30, codigo: "APU-030", descripcion: "Edificio", unidad: "u", modificado: "", orden: 2,
    componentes: [
      { id: 301, tipo: "APU", recursoId: 20, cantidad: 2, formulaCantidad: "=2", factor: 1, orden: 0, modo: "encapsulado" },
    ],
  },
];

test("calcula recursos mixtos y conserva fórmulas de cantidad", () => {
  assert.equal(calcularCostoApu(10, apus, recursos), 250);
});

test("la fórmula modifica exclusivamente la cantidad y admite paréntesis", () => {
  const componente = { id: 1, tipo: "INS", recursoId: 1, cantidad: 99, formulaCantidad: "=2*(3+1)", factor: 1, orden: 0 };
  assert.equal(cantidadComponente(componente), 8);
  assert.equal(recursos[0].precio, 10);
  assert.equal(formulaCantidadValida(componente.formulaCantidad), true);
});

test("rechaza fórmulas de cantidad incorrectas sin usar silenciosamente la cantidad manual", () => {
  const componente = { id: 1, tipo: "INS", recursoId: 1, cantidad: 99, formulaCantidad: "=2*(3+)", factor: 1, orden: 0 };
  assert.equal(formulaCantidadValida(componente.formulaCantidad), false);
  assert.equal(Number.isNaN(cantidadComponente(componente)), true);
  const invalido = [{ id: 99, codigo: "ERR", descripcion: "Error", unidad: "u", modificado: "", orden: 0, componentes: [componente] }];
  assert.equal(calcularCostoApu(99, invalido, recursos), null);
});

test("propaga costos encapsulados sin contabilizar el detalle dos veces", () => {
  assert.equal(calcularCostoApu(20, apus, recursos), 750);
  assert.equal(calcularCostoApu(30, apus, recursos), 1500);
});

test("detecta ciclos a través de varios niveles", () => {
  assert.equal(creariaCiclo(10, 30, apus), true);
  assert.equal(creariaCiclo(30, 10, apus), false);
});

test("explota recursivamente y escala cantidades sin perder fórmulas", () => {
  let id = 1000;
  const explotados = explotarApu(20, apus, 2, () => id++);
  assert.equal(explotados.length, 2);
  assert.equal(explotados[0].formulaCantidad, "=2+3");
  assert.equal(explotados[0].factor, 6);
  assert.notEqual(explotados[0].id, 101);
});

test("un ciclo preexistente no produce recursión infinita", () => {
  const ciclicos = [
    { id: 1, codigo: "A", descripcion: "A", unidad: "u", modificado: "", orden: 0, componentes: [{ id: 1, tipo: "APU", recursoId: 2, cantidad: 1, formulaCantidad: "=1", factor: 1, orden: 0 }] },
    { id: 2, codigo: "B", descripcion: "B", unidad: "u", modificado: "", orden: 1, componentes: [{ id: 2, tipo: "APU", recursoId: 1, cantidad: 1, formulaCantidad: "=1", factor: 1, orden: 0 }] },
  ];
  assert.equal(calcularCostoApu(1, ciclicos, []), null);
});
