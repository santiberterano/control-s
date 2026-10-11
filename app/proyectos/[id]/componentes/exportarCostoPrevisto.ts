import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { ConfiguracionCostoPrevisto, ModeloCostoPrevisto } from "./legajo.ts";

const columnas = ["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Importe", "Incidencia %"];
const monedaExcel = '"$" #,##0.00';
const cantidadExcel = '#,##0.00##';

function moneda(valor: number | null) {
  return valor === null ? "ERROR" : `$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}`;
}

function numero(valor: number | null) {
  return valor === null ? "ERROR" : new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor);
}

function fechaEmision() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

export function generarPdfCostoPrevisto(modelo: ModeloCostoPrevisto, configuracion: ConfiguracionCostoPrevisto) {
  const documento = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  documento.setProperties({ title: `Costo Previsto - ${configuracion.nombreObra}`, subject: "Legajo de Obra CTRL S", creator: "CTRL S" });
  const cuerpo: string[][] = [];
  const tipos: Array<"rubro" | "partida" | "oculto" | "subtotal" | "total"> = [];
  for (const rubro of modelo.rubros) {
    cuerpo.push([rubro.codigo, rubro.nombre.toUpperCase(), "", "", "", "", ""]);
    tipos.push("rubro");
    for (const fila of rubro.filas) {
      cuerpo.push([fila.codigo, fila.descripcion, fila.unidad, numero(fila.cantidad), moneda(fila.precioUnitario), moneda(fila.importe), fila.incidencia === null ? "ERROR" : `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fila.incidencia * 100)} %`]);
      tipos.push(fila.tipo);
    }
    cuerpo.push(["", `SUBTOTAL ${rubro.codigo}`, "", "", "", moneda(rubro.subtotal), modelo.total ? `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rubro.subtotal / modelo.total * 100)} %` : "0,00 %"]);
    tipos.push("subtotal");
  }
  cuerpo.push(["", modelo.completo ? "TOTAL GENERAL" : "TOTAL PARCIAL - DATOS CON ERRORES", "", "", "", moneda(modelo.total), modelo.completo ? "100,00 %" : "NO DEFINITIVO"]);
  tipos.push("total");

  function dibujarCabecera() {
    documento.setTextColor(25, 25, 25);
    documento.setFont("helvetica", "normal");
    documento.setFontSize(7.5);
    documento.text(`${configuracion.nombreObra}  |  ${configuracion.version}`, 8, 8);
    documento.text(`Fecha: ${fechaEmision()}`, 202, 8, { align: "right" });
    documento.setFont("helvetica", "bold");
    documento.setFontSize(12);
    documento.text("COSTO PREVISTO", 105, 14, { align: "center" });
    documento.setFontSize(7.5);
    documento.setFont("helvetica", "normal");
    documento.text(`BASE: ${configuracion.base}`, 8, 20);
    documento.text(`Dólar: ${moneda(configuracion.dolar)}`, 202, 20, { align: "right" });
    documento.setDrawColor(80, 80, 80);
    documento.setLineWidth(0.15);
    documento.line(8, 22, 202, 22);
  }

  autoTable(documento, {
    startY: 24,
    margin: { top: 24, right: 8, bottom: 15, left: 8 },
    head: [columnas],
    body: cuerpo,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 6.7, cellPadding: { top: 1.25, right: 1, bottom: 1.25, left: 1 }, valign: "middle", textColor: [25, 25, 25], lineColor: [205, 205, 205], lineWidth: { bottom: 0.08 }, overflow: "linebreak" },
    headStyles: { fontStyle: "bold", fontSize: 6.5, halign: "center", lineColor: [55, 55, 55], lineWidth: { top: 0.2, bottom: 0.2 }, cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
    columnStyles: {
      0: { cellWidth: 17, halign: "left" },
      1: { cellWidth: 80, halign: "left" },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
    },
    rowPageBreak: "avoid",
    didParseCell: (dato) => {
      if (dato.section !== "body") return;
      const tipo = tipos[dato.row.index];
      if (tipo === "rubro") {
        dato.cell.styles.fontStyle = "bold";
        dato.cell.styles.fontSize = 7.2;
        dato.cell.styles.lineColor = [70, 70, 70];
        dato.cell.styles.lineWidth = { top: 0.25, bottom: 0.12 };
        dato.cell.styles.cellPadding = { top: 2.2, right: 1, bottom: 1.4, left: 1 };
      } else if (tipo === "oculto") {
        dato.cell.styles.textColor = [85, 85, 85];
        if (dato.column.index === 1) dato.cell.styles.cellPadding = { top: 1.25, right: 1, bottom: 1.25, left: 3 };
      } else if (tipo === "subtotal") {
        dato.cell.styles.fontStyle = "bold";
        dato.cell.styles.lineColor = [90, 90, 90];
        dato.cell.styles.lineWidth = { top: 0.18, bottom: 0.08 };
      } else if (tipo === "total") {
        dato.cell.styles.fontStyle = "bold";
        dato.cell.styles.fontSize = 7.5;
        dato.cell.styles.lineColor = [30, 30, 30];
        dato.cell.styles.lineWidth = { top: 0.35, bottom: 0.35 };
        dato.cell.styles.cellPadding = { top: 2, right: 1, bottom: 2, left: 1 };
      }
    },
    didDrawPage: () => {
      dibujarCabecera();
      const pagina = documento.getNumberOfPages();
      documento.setFont("helvetica", "normal");
      documento.setFontSize(7);
      documento.setTextColor(55, 55, 55);
      documento.setDrawColor(110, 110, 110);
      documento.line(8, 286, 202, 286);
      documento.text(`BASE: ${configuracion.base}  |  Dólar: ${moneda(configuracion.dolar)}`, 8, 291);
      documento.text(`Hoja Nro: ${pagina}`, 202, 291, { align: "right" });
    },
  });
  return documento.output("blob");
}

export async function generarExcelCostoPrevisto(modelo: ModeloCostoPrevisto, configuracion: ConfiguracionCostoPrevisto) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "CTRL S";
  libro.created = new Date();
  libro.calcProperties.fullCalcOnLoad = true;
  const hoja = libro.addWorksheet("Costo Previsto", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.15, footer: 0.15 } } });
  hoja.columns = [{ width: 12 }, { width: 52 }, { width: 9 }, { width: 14 }, { width: 17 }, { width: 19 }, { width: 14 }];
  hoja.addRow([`${configuracion.nombreObra}  |  ${configuracion.version}`, "", "", "", "", "", `Fecha: ${fechaEmision()}`]);
  hoja.addRow(["", "", "COSTO PREVISTO"]);
  hoja.addRow([`BASE: ${configuracion.base}`, "", "", "", "", "", `Dólar: ${configuracion.dolar}`]);
  hoja.addRow([]);
  hoja.addRow(columnas);
  hoja.mergeCells("A2:G2");
  hoja.getCell("A2").value = "COSTO PREVISTO";
  hoja.getCell("A2").alignment = { horizontal: "center" };
  hoja.getCell("A2").font = { bold: true, size: 14 };
  hoja.getCell("G1").alignment = { horizontal: "right" };
  hoja.getCell("G3").alignment = { horizontal: "right" };
  const cabecera = hoja.getRow(5);
  cabecera.font = { bold: true, color: { argb: "FF191919" } };
  cabecera.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cabecera.border = { top: { style: "thin", color: { argb: "FF555555" } }, bottom: { style: "thin", color: { argb: "FF555555" } } };
  const filasImporte: number[] = [];
  const filasSubtotal: number[] = [];
  for (const rubro of modelo.rubros) {
    const filaRubro = hoja.addRow([rubro.codigo, rubro.nombre.toUpperCase()]);
    filaRubro.font = { bold: true };
    filaRubro.border = { top: { style: "thin", color: { argb: "FF666666" } }, bottom: { style: "hair", color: { argb: "FF999999" } } };
    filaRubro.height = 18;
    const inicio = hoja.rowCount + 1;
    for (const fila of rubro.filas) {
      const numeroFila = hoja.rowCount + 1;
      const renglon = hoja.addRow([fila.codigo, fila.descripcion, fila.unidad, fila.cantidad, fila.precioUnitario, null, null]);
      if (fila.cantidad !== null && fila.precioUnitario !== null) renglon.getCell(6).value = { formula: `D${numeroFila}*E${numeroFila}`, result: fila.importe ?? 0 };
      renglon.getCell(4).numFmt = cantidadExcel;
      renglon.getCell(5).numFmt = monedaExcel;
      renglon.getCell(6).numFmt = monedaExcel;
      renglon.getCell(7).numFmt = "0.00%";
      renglon.getCell(2).alignment = { vertical: "middle", wrapText: true, indent: fila.tipo === "oculto" ? 1 : 0 };
      for (let columna = 3; columna <= 7; columna += 1) renglon.getCell(columna).alignment = { horizontal: columna === 3 ? "center" : "right", vertical: "middle" };
      renglon.border = { bottom: { style: "hair", color: { argb: "FFD0D0D0" } } };
      if (fila.tipo === "oculto") renglon.font = { color: { argb: "FF5A5A5A" } };
      filasImporte.push(numeroFila);
    }
    const fin = hoja.rowCount;
    const filaSubtotal = hoja.addRow(["", `SUBTOTAL ${rubro.codigo}`, "", "", "", null, null]);
    const numeroSubtotal = filaSubtotal.number;
    filaSubtotal.getCell(6).value = { formula: fin >= inicio ? `SUM(F${inicio}:F${fin})` : "0", result: rubro.subtotal };
    filaSubtotal.getCell(6).numFmt = monedaExcel;
    filaSubtotal.getCell(7).numFmt = "0.00%";
    filaSubtotal.font = { bold: true };
    filaSubtotal.border = { top: { style: "thin", color: { argb: "FF777777" } } };
    filasSubtotal.push(numeroSubtotal);
  }
  const filaTotal = hoja.addRow(["", modelo.completo ? "TOTAL GENERAL" : "TOTAL PARCIAL - DATOS CON ERRORES", "", "", "", null, modelo.completo ? 1 : null]);
  const numeroTotal = filaTotal.number;
  filaTotal.getCell(6).value = { formula: filasSubtotal.length ? filasSubtotal.map((fila) => `F${fila}`).join("+") : "0", result: modelo.total };
  filaTotal.getCell(6).numFmt = monedaExcel;
  filaTotal.getCell(7).numFmt = "0.00%";
  filaTotal.font = { bold: true, size: 12 };
  filaTotal.border = { top: { style: "double", color: { argb: "FF333333" } }, bottom: { style: "double", color: { argb: "FF333333" } } };
  for (const fila of filasImporte) hoja.getCell(`G${fila}`).value = { formula: `IFERROR(F${fila}/$F$${numeroTotal},0)`, result: modelo.total ? Number(hoja.getCell(`F${fila}`).result ?? 0) / modelo.total : 0 };
  for (const fila of filasSubtotal) hoja.getCell(`G${fila}`).value = { formula: `IFERROR(F${fila}/$F$${numeroTotal},0)`, result: modelo.total ? Number(hoja.getCell(`F${fila}`).result ?? 0) / modelo.total : 0 };
  hoja.views = [{ state: "frozen", ySplit: 5 }];
  hoja.pageSetup.printTitlesRow = "1:5";
  hoja.pageSetup.printArea = `A1:G${numeroTotal}`;
  hoja.headerFooter.oddFooter = `&LBASE: ${configuracion.base} | Dólar: ${configuracion.dolar}&RHoja Nro: &P`;
  hoja.properties.defaultRowHeight = 15;
  const contenido = await libro.xlsx.writeBuffer();
  return new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
