import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { generarExcelCostoPrevisto, generarPdfCostoPrevisto } from "../app/proyectos/[id]/componentes/exportarCostoPrevisto.ts";
import { crearInformeLegajo, crearModeloCostoPrevisto, sanitizarNombreArchivo } from "../app/proyectos/[id]/componentes/legajo.ts";

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

test("el modelo de costo previsto intercala ocultos y evita duplicar sus importes", () => {
  const modelo = crearModeloCostoPrevisto(datos);
  assert.deepEqual(modelo.rubros[0].filas.map((fila) => fila.tipo), ["partida", "oculto"]);
  assert.equal(modelo.rubros[0].filas[0].importe, 9000);
  assert.equal(modelo.rubros[0].filas[1].importe, 1000);
  assert.equal(modelo.rubros[0].subtotal, 10000);
  assert.equal(modelo.total, 10000);
  assert.equal(modelo.rubros[0].filas[0].incidencia, 0.9);
  assert.equal(modelo.rubros[0].filas[1].incidencia, 0.1);
});

test("prioriza la descripción alternativa sin concatenar códigos de biblioteca", () => {
  const modelo = crearModeloCostoPrevisto({ ...datos, partidas: [{ ...partidas[0], descripcionAlternativa: "Descripción interna extendida" }] });
  assert.equal(modelo.rubros[0].filas[0].descripcion, "Descripción interna extendida");
  assert.equal(modelo.rubros[0].filas[0].codigo, "01.1");
});

test("marca el total como no definitivo cuando hay datos inválidos", () => {
  const modelo = crearModeloCostoPrevisto({ ...datos, partidas: [{ ...partidas[0], formulaCantidad: "" }] });
  assert.equal(modelo.completo, false);
  assert.equal(modelo.rubros[0].filas[0].importe, null);
  assert.ok(modelo.advertencias.length > 0);
});

test("genera PDF A4 vertical con cabecera y pie", async () => {
  const modelo = crearModeloCostoPrevisto(datos);
  const blob = generarPdfCostoPrevisto(modelo, { nombreObra: "Obra", version: "V00", dolar: 1450, base: "620" });
  const contenido = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  assert.ok(contenido.startsWith("%PDF-"));
  assert.match(contenido, /\/MediaBox \[0 0 595\.\d+ 841\.\d+\]/);
  assert.equal((contenido.match(/\/Type \/Page\b/g) ?? []).length, 1);
  assert.equal((contenido.match(/COSTO PREVISTO/g) ?? []).length, 1);
  assert.equal((contenido.match(/Hoja Nro/g) ?? []).length, 1);
});

test("genera Excel editable con números, fórmulas e impresión A4 vertical", async () => {
  const modelo = crearModeloCostoPrevisto(datos);
  const blob = await generarExcelCostoPrevisto(modelo, { nombreObra: "Obra", version: "V00", dolar: 1450, base: "620" });
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await blob.arrayBuffer());
  const hoja = libro.getWorksheet("Costo Previsto");
  assert.ok(hoja);
  assert.equal(hoja.pageSetup.paperSize, 9);
  assert.equal(hoja.pageSetup.orientation, "portrait");
  assert.equal(hoja.pageSetup.fitToWidth, 1);
  assert.equal(hoja.getCell("D7").value, 3);
  assert.equal(hoja.getCell("E7").value, 3000);
  assert.equal(hoja.getCell("F7").value.formula, "D7*E7");
  assert.equal(hoja.getCell("F8").value.formula, "D8*E8");
  assert.equal(hoja.getCell("F9").value.formula, "SUM(F7:F8)");
  assert.equal(hoja.getCell("F10").value.formula, "F9");
  assert.equal(hoja.getCell("G7").value.formula, "IFERROR(F7/$F$10,0)");
});
