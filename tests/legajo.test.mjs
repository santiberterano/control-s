import assert from "node:assert/strict";
import test from "node:test";
import { crearInformeLegajo, sanitizarNombreArchivo } from "../app/proyectos/[id]/componentes/legajo.ts";

const rubros = [{ id: 1, nombre: "Estructura", orden: 0 }];
const recursos = [
  { id: 1, tipo: "INS", codigo: "HAO-001", nombre: "Cemento", unidad: "kg", precio: 100 },
  { id: 2, tipo: "MDO", codigo: "2M", nombre: "Oficial", unidad: "h", precio: 1000 },
];
const apus = [{ id: 10, codigo: "EST-001", descripcion: "Hormigón", unidad: "m3", modificado: "", orden: 0, componentes: [
  { id: 101, tipo: "INS", recursoId: 1, cantidad: 0, formulaCantidad: "=10", factor: 1, orden: 0 },
  { id: 102, tipo: "MDO", recursoId: 2, cantidad: 0, formulaCantidad: "=2", factor: 1, orden: 1 },
] }];
const partidas = [{ id: 20, rubroId: 1, codigo: 1, tipo: "APU", recursoId: 10, descripcionAlternativa: "", cantidad: 0, formulaCantidad: "3", ocultos: [
  { id: 30, descripcion: "Ayuda", componentes: [{ id: 31, tipo: "MDO", recursoId: 2, cantidad: 0, formulaCantidad: "1", factor: 1, orden: 0 }] },
] }];
const datos = { rubros, partidas, apus, recursos, familiasInsumos: [{ recursoId: 1, nombre: "Aglomerantes" }] };

test("genera el costo previsto con el costo oculto vigente", () => {
  const informe = crearInformeLegajo("previsto", datos);
  assert.equal(informe.total, 10000);
  assert.equal(informe.secciones[0].filas[0]["Costos ocultos"], 1000);
});

test("explota APU y costos ocultos sin alterar el presupuesto", () => {
  const original = structuredClone(partidas);
  const informe = crearInformeLegajo("explotado", datos);
  assert.equal(informe.secciones[0].filas.length, 3);
  assert.equal(informe.total, 10000);
  assert.deepEqual(partidas, original);
});

test("consolida recursos por tipo y familia", () => {
  const informe = crearInformeLegajo("insumos", datos);
  const insumos = informe.secciones.find((seccion) => seccion.titulo === "Insumos · Aglomerantes");
  const manoDeObra = informe.secciones.find((seccion) => seccion.titulo === "Mano de obra · Sin familia");
  assert.equal(insumos.filas[0].Cantidad, 30);
  assert.equal(manoDeObra.filas[0].Cantidad, 7);
});

test("informa fórmulas inválidas sin ocultar la partida", () => {
  const informe = crearInformeLegajo("previsto", { ...datos, partidas: [{ ...partidas[0], formulaCantidad: "" }] });
  assert.equal(informe.secciones[0].filas.length, 1);
  assert.equal(informe.secciones[0].filas[0].Cantidad, "Error");
  assert.equal(informe.advertencias.length, 1);
});

test("sanitiza nombres incompatibles con el sistema operativo", () => {
  assert.equal(sanitizarNombreArchivo("CTRL S: Obra/Sur?"), "CTRL_S_Obra_Sur_");
});
