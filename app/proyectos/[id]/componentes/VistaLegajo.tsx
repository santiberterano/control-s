"use client";

import { useMemo, useState } from "react";
import type { Apu, RecursoApu } from "./apu";
import { crearInformeLegajo, sanitizarNombreArchivo, type InformeLegajo, type TipoInformeLegajo } from "./legajo";
import type { PartidaPresupuesto, RubroPresupuesto } from "./presupuesto";
import type { CategoriaInsumo, Insumo } from "./VistaInsumos";

type Formato = "pdf" | "xlsx";
type Props = {
  nombreObra: string;
  rubros: RubroPresupuesto[];
  partidas: PartidaPresupuesto[];
  apus: Apu[];
  recursos: RecursoApu[];
  insumos: Insumo[];
  categoriasInsumos: CategoriaInsumo[];
};

const opciones: Array<{ id: TipoInformeLegajo; titulo: string; descripcion: string }> = [
  { id: "previsto", titulo: "Costo previsto", descripcion: "Presupuesto vigente por rubro y partida, incluyendo los costos ocultos." },
  { id: "explotado", titulo: "Costo explotado", descripcion: "Composición detallada de APU, sub-APU, recursos directos y costos ocultos." },
  { id: "insumos", titulo: "Explosión de insumos", descripcion: "Recursos consolidados por tipo y familia: insumos, mano de obra, equipos y subcontratos." },
];

function fechaArchivo() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function moneda(valor: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(valor);
}

async function guardarArchivo(blob: Blob, nombre: string, descripcion: string) {
  const navegador = window as Window & {
    showSaveFilePicker?: (opciones: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{ createWritable: () => Promise<{ write: (contenido: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  };
  const extension = nombre.endsWith(".pdf") ? ".pdf" : ".xlsx";
  const mime = extension === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (navegador.showSaveFilePicker) {
    try {
      const archivo = await navegador.showSaveFilePicker({ suggestedName: nombre, types: [{ description: descripcion, accept: { [mime]: [extension] } }] });
      const escritura = await archivo.createWritable();
      await escritura.write(blob);
      await escritura.close();
      return "guardado" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelado" as const;
      throw error;
    }
  }
  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "descargado" as const;
}

async function generarPdf(informe: InformeLegajo, nombreObra: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const documento = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  documento.setProperties({ title: `${informe.titulo} - ${nombreObra}`, subject: "Legajo de Obra CTRL S", creator: "CTRL S" });
  documento.setFontSize(17);
  documento.text("CTRL S · Legajo de Obra", 14, 15);
  documento.setFontSize(12);
  documento.text(informe.titulo, 14, 23);
  documento.setFontSize(9);
  documento.text(`${nombreObra} · Emitido ${new Intl.DateTimeFormat("es-AR").format(new Date())}`, 14, 29);
  let y = 36;
  for (const seccion of informe.secciones) {
    if (y > 180) { documento.addPage(); y = 15; }
    documento.setFontSize(10);
    documento.setFont("helvetica", "bold");
    documento.text(seccion.titulo, 14, y);
    documento.setFont("helvetica", "normal");
    autoTable(documento, {
      startY: y + 3,
      head: [seccion.columnas],
      body: seccion.filas.length ? seccion.filas.map((fila) => seccion.columnas.map((columna) => fila[columna] ?? "")) : [["Sin registros"]],
      styles: { fontSize: 7, cellPadding: 1.6 },
      headStyles: { fillColor: [27, 29, 31], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      margin: { left: 14, right: 14 },
    });
    y = ((documento as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;
  }
  if (informe.total !== undefined) {
    if (y > 190) { documento.addPage(); y = 15; }
    documento.setFont("helvetica", "bold");
    documento.text(`TOTAL: ${moneda(informe.total)}`, 282, y, { align: "right" });
  }
  if (informe.advertencias.length) {
    documento.addPage();
    documento.setFontSize(12);
    documento.text("Advertencias de cálculo", 14, 16);
    documento.setFontSize(9);
    documento.setFont("helvetica", "normal");
    const lineas = informe.advertencias.flatMap((advertencia) => documento.splitTextToSize(`• ${advertencia}`, 265));
    documento.text(lineas, 14, 24);
  }
  return documento.output("blob");
}

async function generarExcel(informe: InformeLegajo, nombreObra: string) {
  const { Workbook } = await import("exceljs");
  const libro = new Workbook();
  libro.creator = "CTRL S";
  libro.created = new Date();
  for (const [indice, seccion] of informe.secciones.entries()) {
    const nombre = sanitizarNombreArchivo(seccion.titulo).slice(0, 26) || `Sección ${indice + 1}`;
    const hoja = libro.addWorksheet(`${String(indice + 1).padStart(2, "0")} ${nombre}`.slice(0, 31));
    hoja.addRow(["CTRL S · Legajo de Obra"]);
    hoja.addRow([informe.titulo]);
    hoja.addRow([nombreObra]);
    hoja.addRow([]);
    hoja.addRow(seccion.columnas);
    for (const fila of seccion.filas) hoja.addRow(seccion.columnas.map((columna) => fila[columna] ?? ""));
    const encabezado = hoja.getRow(5);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B1D1F" } };
    hoja.views = [{ state: "frozen", ySplit: 5 }];
    hoja.columns.forEach((columna) => { columna.width = Math.min(45, Math.max(12, ...seccion.filas.map((fila) => String(fila[columna.header as string] ?? "").length + 2))); });
    hoja.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: Math.max(1, seccion.columnas.length) } };
  }
  const resumen = libro.addWorksheet("Resumen");
  resumen.addRows([["CTRL S · Legajo de Obra"], [informe.titulo], [nombreObra], ["Fecha", new Intl.DateTimeFormat("es-AR").format(new Date())], ["Total", informe.total ?? ""], [], ["Advertencias"]]);
  informe.advertencias.forEach((advertencia) => resumen.addRow([advertencia]));
  resumen.getColumn(1).width = 90;
  resumen.getRow(1).font = { bold: true, size: 16 };
  resumen.getRow(7).font = { bold: true };
  const contenido = await libro.xlsx.writeBuffer();
  return new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export default function VistaLegajo({ nombreObra, rubros, partidas, apus, recursos, insumos, categoriasInsumos }: Props) {
  const [tipo, setTipo] = useState<TipoInformeLegajo>("previsto");
  const [formato, setFormato] = useState<Formato>("pdf");
  const [estado, setEstado] = useState("");
  const [generando, setGenerando] = useState(false);
  const familiasInsumos = useMemo(() => insumos.map((insumo) => ({ recursoId: insumo.id, nombre: categoriasInsumos.find((categoria) => categoria.id === insumo.categoriaId)?.nombre ?? "Sin categoría" })), [categoriasInsumos, insumos]);
  const informe = useMemo(() => crearInformeLegajo(tipo, { rubros, partidas, apus, recursos, familiasInsumos }), [tipo, rubros, partidas, apus, recursos, familiasInsumos]);
  const seleccion = opciones.find((opcion) => opcion.id === tipo) ?? opciones[0];

  async function exportar() {
    setGenerando(true);
    setEstado("Generando el archivo con los datos actuales…");
    try {
      const etiqueta = { previsto: "Costo_Previsto", explotado: "Costo_Explotado", insumos: "Explosion_Insumos" }[tipo];
      const nombre = `${sanitizarNombreArchivo(`CTRL_S_${etiqueta}_${nombreObra}_${fechaArchivo()}`)}.${formato}`;
      const blob = formato === "pdf" ? await generarPdf(informe, nombreObra) : await generarExcel(informe, nombreObra);
      const resultado = await guardarArchivo(blob, nombre, formato === "pdf" ? "Documento PDF" : "Libro de Excel");
      setEstado(resultado === "cancelado" ? "Exportación cancelada." : resultado === "guardado" ? `Archivo guardado: ${nombre}` : `Descarga iniciada: ${nombre}`);
    } catch (error) {
      console.error(error);
      setEstado("No se pudo generar el archivo. Revisá las advertencias e intentá nuevamente.");
    } finally {
      setGenerando(false);
    }
  }

  return <div>
    <div className="mb-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Documentación del proyecto</div><h1 className="mt-1 text-2xl font-bold">Legajo de Obra</h1><p className="mt-1 text-sm text-zinc-500">Generá cada informe de forma independiente con la información vigente, sin cerrar ni aprobar el presupuesto.</p></div>
    <div className="grid gap-5 lg:grid-cols-[370px_minmax(0,1fr)]">
      <div className="space-y-2">{opciones.map((opcion) => <button key={opcion.id} type="button" onClick={() => setTipo(opcion.id)} className={`w-full rounded-lg border p-4 text-left transition ${tipo === opcion.id ? "border-[#E6B012] bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]" : "border-zinc-300 bg-white hover:border-zinc-400"}`}><div className="font-bold text-zinc-900">{opcion.titulo}</div><div className="mt-1 text-xs leading-5 text-zinc-500">{opcion.descripcion}</div></button>)}</div>
      <div className="rounded-lg border border-zinc-300 bg-white">
        <div className="border-b border-zinc-200 p-5"><div className="text-lg font-bold">{seleccion.titulo}</div><p className="mt-1 text-sm text-zinc-500">{informe.descripcion}</p></div>
        <div className="p-5">
          <div className="mb-5"><div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Formato</div><div className="flex gap-2">{(["pdf", "xlsx"] as Formato[]).map((actual) => <button key={actual} type="button" onClick={() => setFormato(actual)} className={`rounded-md border px-5 py-2 text-sm font-bold uppercase ${formato === actual ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-600"}`}>{actual === "xlsx" ? "Excel" : "PDF"}</button>)}</div></div>
          <div className={`mb-5 rounded-md border px-4 py-3 text-sm ${informe.advertencias.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800"}`}><div className="font-semibold">{informe.advertencias.length ? `${informe.advertencias.length} advertencia${informe.advertencias.length === 1 ? "" : "s"} de cálculo` : "Datos listos para exportar"}</div>{informe.advertencias.length > 0 && <ul className="mt-2 max-h-32 list-disc overflow-auto pl-5 text-xs">{informe.advertencias.map((advertencia, indice) => <li key={`${indice}-${advertencia}`}>{advertencia}</li>)}</ul>}</div>
          <div className="mb-5 grid grid-cols-3 gap-3 text-center"><Resumen etiqueta="Secciones" valor={informe.secciones.length}/><Resumen etiqueta="Registros" valor={informe.secciones.reduce((suma, seccion) => suma + seccion.filas.length, 0)}/><Resumen etiqueta="Total" valor={informe.total === undefined ? "—" : moneda(informe.total)}/></div>
          <button type="button" disabled={generando} onClick={exportar} className="rounded-md bg-[#E6B012] px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-[#d5a20f] disabled:cursor-wait disabled:opacity-60">{generando ? "Generando…" : `Exportar ${formato === "pdf" ? "PDF" : "Excel"}`}</button>
          <p className="mt-3 text-xs text-zinc-500">Si el navegador admite el selector de guardado, podrás elegir ubicación y nombre. En los demás navegadores se iniciará una descarga convencional.</p>
          {estado && <div role="status" className="mt-3 text-sm font-medium text-zinc-700">{estado}</div>}
        </div>
      </div>
    </div>
  </div>;
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return <div className="rounded-md bg-[#f7f7f5] px-3 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{etiqueta}</div><div className="mt-1 truncate text-sm font-bold text-zinc-800">{valor}</div></div>;
}
