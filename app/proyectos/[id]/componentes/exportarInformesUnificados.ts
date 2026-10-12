import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { ConfiguracionCostoPrevisto } from "./legajo.ts";
import type { AnalisisJerarquico, ModeloCostoExplotado, ModeloExplosion } from "./modelosInformesLegajo.ts";

type TipoFila = "grupo" | "familia" | "partida" | "detalle" | "oculto" | "subtotal" | "total";
type Fila = { tipo: TipoFila; celdas: Array<string | number | null>; nivel?: number; economica?: boolean };
const formatoMonedaExcel = '"$" #,##0.00';
const formatoCantidadExcel = "#,##0.00##";
const dinero = (valor: number | null) => valor === null ? "ERROR" : `$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}`;
const cantidad = (valor: number | null) => valor === null ? "ERROR" : new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor);
const fecha = () => new Intl.DateTimeFormat("es-AR").format(new Date());

function analizarFilas(analisis: AnalisisJerarquico, filas: Fila[], prefijo = "APU") {
  filas.push({ tipo: "detalle", nivel: analisis.nivel, celdas: [prefijo, analisis.codigo, analisis.descripcion, analisis.unidad, analisis.coeficientePadre, analisis.costoUnitario, analisis.incidenciaPadre] });
  for (const componente of analisis.componentes) filas.push({ tipo: "detalle", nivel: componente.nivel + 1, celdas: [componente.tipo, componente.codigo, componente.descripcion, componente.unidad, componente.coeficiente, componente.precioUnitario, componente.importe] });
  filas.push({ tipo: "subtotal", nivel: analisis.nivel + 1, celdas: ["", "", `Costo unitario ${analisis.codigo}`, analisis.unidad, "", "", analisis.costoUnitario] });
  for (const hijo of analisis.subanalisis) analizarFilas(hijo, filas, "Sub-APU");
}

function filasCostoExplotado(modelo: ModeloCostoExplotado) {
  const filas: Fila[] = [];
  for (const rubro of modelo.rubros) {
    filas.push({ tipo: "grupo", celdas: [rubro.codigo, "", rubro.nombre.toUpperCase(), "", "", "", ""] });
    for (const partida of rubro.partidas) {
      filas.push({ tipo: "partida", economica: true, celdas: ["Partida", partida.codigo, partida.descripcion, partida.unidad, partida.cantidad, partida.precioUnitario, partida.importePropio] });
      if (partida.analisis) analizarFilas(partida.analisis, filas);
      for (const oculto of partida.ocultos) {
        filas.push({ tipo: "oculto", economica: true, celdas: ["Oculto", "", `- ${oculto.descripcion}`, "", "", "", oculto.total] });
        for (const componente of oculto.componentes) filas.push({ tipo: "detalle", nivel: 1, celdas: [componente.tipo, componente.codigo, componente.descripcion, componente.unidad, componente.coeficiente, componente.precioUnitario, componente.importe] });
        for (const analisis of oculto.analisis) analizarFilas(analisis, filas, "Sub-APU oculto");
      }
      filas.push({ tipo: "subtotal", nivel: 1, economica: true, celdas: ["", "", `Total consolidado ${partida.codigo}`, "", "", "", partida.total] });
    }
    filas.push({ tipo: "subtotal", nivel: 0, economica: true, celdas: ["", "", `SUBTOTAL ${rubro.codigo}`, "", "", "", rubro.subtotal] });
  }
  filas.push({ tipo: "total", economica: true, celdas: ["", "", modelo.completo ? "TOTAL GENERAL" : "TOTAL PARCIAL - DATOS CON ERRORES", "", "", "", modelo.total] });
  return filas;
}

function filasExplosion(modelo: ModeloExplosion) {
  const filas: Fila[] = [];
  for (const grupo of modelo.grupos) {
    filas.push({ tipo: "grupo", celdas: ["", grupo.nombre, "", "", "", ""] });
    for (const familia of grupo.familias) {
      filas.push({ tipo: "familia", celdas: ["", familia.nombre.toUpperCase(), "", "", "", ""] });
      for (const recurso of familia.recursos) filas.push({ tipo: "detalle", economica: true, celdas: [recurso.codigo, recurso.descripcion, recurso.unidad, recurso.cantidad, recurso.precioUnitario, recurso.total] });
      filas.push({ tipo: "subtotal", nivel: 1, economica: true, celdas: ["", `Subtotal ${familia.nombre}`, "", "", "", familia.subtotal] });
    }
    filas.push({ tipo: "subtotal", nivel: 0, economica: true, celdas: ["", `SUBTOTAL ${grupo.nombre}`, "", "", "", grupo.subtotal] });
  }
  filas.push({ tipo: "total", economica: true, celdas: ["", modelo.completo ? "TOTAL GENERAL" : "TOTAL PARCIAL - REVISAR ADVERTENCIAS", "", "", "", modelo.total] });
  return filas;
}

function generarPdf(titulo: string, columnas: string[], anchos: number[], filas: Fila[], configuracion: ConfiguracionCostoPrevisto) {
  const documento = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  documento.setProperties({ title: `${titulo} - ${configuracion.nombreObra}`, creator: "CTRL S" });
  const cuerpo = filas.map((fila) => fila.celdas.map((celda, indice) => {
    if (typeof celda !== "number") return celda ?? "ERROR";
    const monetaria = titulo === "COSTO EXPLOTADO" ? indice >= 5 : indice >= 4;
    return monetaria ? dinero(celda) : cantidad(celda);
  }));
  autoTable(documento, {
    startY: 24, margin: { top: 24, right: 8, bottom: 15, left: 8 }, head: [columnas], body: cuerpo, theme: "plain", rowPageBreak: "avoid",
    styles: { font: "helvetica", fontSize: 6.5, cellPadding: { top: 1.2, right: 1, bottom: 1.2, left: 1 }, textColor: [25, 25, 25], lineColor: [205, 205, 205], lineWidth: { bottom: 0.08 }, overflow: "linebreak", valign: "middle" },
    headStyles: { fontStyle: "bold", halign: "center", lineColor: [55, 55, 55], lineWidth: { top: 0.2, bottom: 0.2 } },
    columnStyles: Object.fromEntries(anchos.map((cellWidth, indice) => [indice, { cellWidth, halign: indice >= anchos.length - 3 ? "right" : indice === 3 ? "center" : "left" }])),
    didParseCell: (dato) => { if (dato.section !== "body") return; const fila = filas[dato.row.index]; if (dato.column.index === (titulo === "COSTO EXPLOTADO" ? 2 : 1) && fila.nivel) dato.cell.styles.cellPadding = { top: 1.2, right: 1, bottom: 1.2, left: 1 + fila.nivel * 3 }; if (["grupo", "partida", "subtotal", "total"].includes(fila.tipo)) dato.cell.styles.fontStyle = "bold"; if (fila.tipo === "grupo") { dato.cell.styles.lineColor = [60, 60, 60]; dato.cell.styles.lineWidth = { top: 0.25, bottom: 0.12 }; dato.cell.styles.cellPadding = 1.8; } if (fila.tipo === "oculto") dato.cell.styles.textColor = [80, 80, 80]; if (fila.tipo === "total") { dato.cell.styles.fontSize = 7.5; dato.cell.styles.lineWidth = { top: 0.35, bottom: 0.35 }; } },
    didDrawPage: () => { documento.setTextColor(25); documento.setFontSize(7.5); documento.setFont("helvetica", "normal"); documento.text(`${configuracion.nombreObra}  |  ${configuracion.version}`, 8, 8); documento.text(`Fecha: ${fecha()}`, 202, 8, { align: "right" }); documento.setFont("helvetica", "bold"); documento.setFontSize(12); documento.text(titulo, 105, 14, { align: "center" }); documento.setFont("helvetica", "normal"); documento.setFontSize(7.5); documento.text(`BASE: ${configuracion.base}`, 8, 20); documento.text(`Dólar: ${dinero(configuracion.dolar)}`, 202, 20, { align: "right" }); documento.line(8, 22, 202, 22); documento.line(8, 286, 202, 286); documento.setFontSize(7); documento.text(`BASE: ${configuracion.base}  |  Dólar: ${dinero(configuracion.dolar)}`, 8, 291); documento.text(`Hoja Nro: ${documento.getNumberOfPages()}`, 202, 291, { align: "right" }); },
  });
  return documento.output("blob");
}

function libroBase(nombreHoja: string, titulo: string, columnas: string[], anchos: number[], configuracion: ConfiguracionCostoPrevisto) {
  const libro = new ExcelJS.Workbook(); libro.creator = "CTRL S"; libro.created = new Date(); libro.calcProperties.fullCalcOnLoad = true;
  const hoja = libro.addWorksheet(nombreHoja, { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.15, footer: 0.15 } } });
  hoja.columns = anchos.map((width) => ({ width })); hoja.addRow([`${configuracion.nombreObra} | ${configuracion.version}`, "", "", "", "", `Fecha: ${fecha()}`]); hoja.addRow([titulo]); hoja.addRow([`BASE: ${configuracion.base}`, "", "", "", "", `Dólar: ${configuracion.dolar}`]); hoja.addRow([]); hoja.addRow(columnas); hoja.mergeCells(2, 1, 2, columnas.length); hoja.getCell("A2").alignment = { horizontal: "center" }; hoja.getCell("A2").font = { bold: true, size: 14 }; const cabecera = hoja.getRow(5); cabecera.font = { bold: true }; cabecera.alignment = { horizontal: "center", wrapText: true }; cabecera.border = { top: { style: "thin" }, bottom: { style: "thin" } }; hoja.pageSetup.printTitlesRow = "1:5"; hoja.views = [{ state: "frozen", ySplit: 5 }]; hoja.headerFooter.oddFooter = `&LBASE: ${configuracion.base} | Dólar: ${configuracion.dolar}&RHoja Nro: &P`; return { libro, hoja };
}

async function generarExcel(nombre: string, titulo: string, columnas: string[], anchos: number[], filas: Fila[], configuracion: ConfiguracionCostoPrevisto, monetarias: number[]) {
  const { libro, hoja } = libroBase(nombre, titulo, columnas, anchos, configuracion); const pendientes: number[] = []; const subtotalesGrupo: number[] = []; const totales: number[] = []; const importeCol = columnas.length;
  for (const fila of filas) { const renglon = hoja.addRow(fila.celdas); const numero = renglon.number; if (fila.tipo === "detalle" || fila.tipo === "partida") { const cantidadCol = columnas.length === 7 ? 5 : 4, precioCol = cantidadCol + 1; if (typeof fila.celdas[cantidadCol - 1] === "number" && typeof fila.celdas[precioCol - 1] === "number") renglon.getCell(importeCol).value = { formula: `${renglon.getCell(cantidadCol).address}*${renglon.getCell(precioCol).address}`, result: Number(fila.celdas[importeCol - 1] ?? 0) }; } if (fila.economica && fila.tipo !== "subtotal" && fila.tipo !== "total") pendientes.push(numero); if (fila.economica && fila.tipo === "subtotal" && fila.nivel === 1) { renglon.getCell(importeCol).value = { formula: pendientes.length ? pendientes.map((actual) => `${String.fromCharCode(64 + importeCol)}${actual}`).join("+") : "0", result: Number(fila.celdas[importeCol - 1] ?? 0) }; pendientes.length = 0; subtotalesGrupo.push(numero); } else if (fila.economica && fila.tipo === "subtotal" && fila.nivel === 0) { renglon.getCell(importeCol).value = { formula: subtotalesGrupo.length ? subtotalesGrupo.map((actual) => `${String.fromCharCode(64 + importeCol)}${actual}`).join("+") : "0", result: Number(fila.celdas[importeCol - 1] ?? 0) }; subtotalesGrupo.length = 0; totales.push(numero); } else if (fila.economica && fila.tipo === "total") renglon.getCell(importeCol).value = { formula: totales.length ? totales.map((actual) => `${String.fromCharCode(64 + importeCol)}${actual}`).join("+") : "0", result: Number(fila.celdas[importeCol - 1] ?? 0) }; if (["grupo", "partida", "subtotal", "total"].includes(fila.tipo)) renglon.font = { bold: true }; if (fila.tipo === "oculto") renglon.font = { color: { argb: "FF555555" } }; if (fila.nivel) renglon.getCell(columnas.length === 7 ? 3 : 2).alignment = { indent: Math.min(10, fila.nivel), wrapText: true }; renglon.border = { bottom: { style: "hair", color: { argb: "FFD0D0D0" } } }; renglon.getCell(columnas.length === 7 ? 5 : 4).numFmt = formatoCantidadExcel; for (const columna of monetarias) renglon.getCell(columna).numFmt = formatoMonedaExcel; }
  const totalFila = hoja.rowCount; hoja.pageSetup.printArea = `A1:${String.fromCharCode(64 + columnas.length)}${totalFila}`; hoja.properties.defaultRowHeight = 15;
  const contenido = await libro.xlsx.writeBuffer(); return new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export const generarPdfCostoExplotado = (modelo: ModeloCostoExplotado, configuracion: ConfiguracionCostoPrevisto) => generarPdf("COSTO EXPLOTADO", ["Tipo", "Código", "Descripción", "Un.", "Coef./Cant.", "P. unitario", "Importe"], [16, 20, 77, 10, 20, 25, 26], filasCostoExplotado(modelo), configuracion);
export const generarPdfExplosion = (modelo: ModeloExplosion, configuracion: ConfiguracionCostoPrevisto) => generarPdf("EXPLOSIÓN DE INSUMOS", ["Código", "Descripción", "Un.", "Cantidad", "P. unitario", "Costo total"], [24, 83, 13, 24, 25, 25], filasExplosion(modelo), configuracion);
export const generarExcelCostoExplotado = (modelo: ModeloCostoExplotado, configuracion: ConfiguracionCostoPrevisto) => generarExcel("Costo Explotado", "COSTO EXPLOTADO", ["Tipo", "Código", "Descripción", "Un.", "Coef./Cant.", "P. unitario", "Importe"], [14, 16, 48, 9, 14, 18, 19], filasCostoExplotado(modelo), configuracion, [6, 7]);
export const generarExcelExplosion = (modelo: ModeloExplosion, configuracion: ConfiguracionCostoPrevisto) => generarExcel("Explosión de Insumos", "EXPLOSIÓN DE INSUMOS", ["Código", "Descripción", "Un.", "Cantidad", "P. unitario", "Costo total"], [18, 55, 9, 16, 18, 20], filasExplosion(modelo), configuracion, [5, 6]);
