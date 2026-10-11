import { cantidadComponente, type Apu, type RecursoApu, type TipoComponenteApu } from "./apu.ts";
import { calcularPartida, cantidadDesdeFormula, precioRecursoPresupuesto, type PartidaPresupuesto, type RubroPresupuesto } from "./presupuesto.ts";

export type TipoInformeLegajo = "previsto" | "explotado" | "insumos";
export type FilaInforme = Record<string, string | number>;
export type SeccionInforme = { titulo: string; columnas: string[]; filas: FilaInforme[] };
export type InformeLegajo = { titulo: string; descripcion: string; secciones: SeccionInforme[]; advertencias: string[]; total?: number };
export type FamiliaRecurso = { recursoId: number; nombre: string };
export type ConfiguracionCostoPrevisto = { nombreObra: string; version: string; dolar: number; base: string };
export type FilaCostoPrevisto = {
  tipo: "partida" | "oculto";
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number | null;
  precioUnitario: number | null;
  importe: number | null;
  incidencia: number | null;
};
export type RubroCostoPrevisto = { codigo: string; nombre: string; filas: FilaCostoPrevisto[]; subtotal: number; completo: boolean };
export type ModeloCostoPrevisto = { rubros: RubroCostoPrevisto[]; total: number; completo: boolean; advertencias: string[] };

type DatosLegajo = {
  rubros: RubroPresupuesto[];
  partidas: PartidaPresupuesto[];
  apus: Apu[];
  recursos: RecursoApu[];
  familiasInsumos: FamiliaRecurso[];
};

const nombresTipo: Record<TipoComponenteApu, string> = {
  APU: "Subanálisis",
  INS: "Insumos",
  MDO: "Mano de obra",
  ALQ: "Equipos",
  SUB: "Subcontratos",
  CON: "Constantes",
};

function nombrePartida(partida: PartidaPresupuesto, apus: Apu[], recursos: RecursoApu[]) {
  if (partida.descripcionAlternativa.trim()) return partida.descripcionAlternativa.trim();
  if (partida.tipo === "APU") return apus.find((apu) => apu.id === partida.recursoId)?.descripcion ?? "Recurso inexistente";
  return recursos.find((recurso) => recurso.tipo === partida.tipo && recurso.id === partida.recursoId)?.nombre ?? "Recurso inexistente";
}

function codigoPartida(partida: PartidaPresupuesto, rubros: RubroPresupuesto[]) {
  const rubro = [...rubros].sort((a, b) => a.orden - b.orden).findIndex((actual) => actual.id === partida.rubroId) + 1;
  return `${rubro > 0 ? rubro : "?"}.${String(partida.codigo).padStart(2, "0")}`;
}

export function crearModeloCostoPrevisto(datos: DatosLegajo): ModeloCostoPrevisto {
  const advertencias: string[] = [];
  const rubrosOrdenados = [...datos.rubros].sort((a, b) => a.orden - b.orden);
  const rubros = rubrosOrdenados.map((rubro) => {
    const codigoRubro = String(rubro.orden + 1).padStart(2, "0");
    const filas: FilaCostoPrevisto[] = [];
    let completo = true;
    for (const partida of datos.partidas.filter((actual) => actual.rubroId === rubro.id).sort((a, b) => a.codigo - b.codigo)) {
      const cantidad = cantidadDesdeFormula(partida.formulaCantidad);
      const precio = precioRecursoPresupuesto(partida.tipo, partida.recursoId, datos.apus, datos.recursos);
      const codigo = `${codigoRubro}.${partida.codigo}`;
      const valida = Number.isFinite(cantidad) && precio !== null;
      if (!valida) {
        completo = false;
        advertencias.push(`${codigo}: no se pudo calcular la partida por fórmula o referencia inválida.`);
      }
      const importe = valida ? cantidad * precio : null;
      filas.push({
        tipo: "partida",
        codigo,
        descripcion: nombrePartida(partida, datos.apus, datos.recursos),
        unidad: partida.tipo === "APU" ? datos.apus.find((apu) => apu.id === partida.recursoId)?.unidad ?? "" : datos.recursos.find((recurso) => recurso.tipo === partida.tipo && recurso.id === partida.recursoId)?.unidad ?? "",
        cantidad: valida ? cantidad : null,
        precioUnitario: precio,
        importe,
        incidencia: null,
      });
      for (const oculto of partida.ocultos ?? []) {
        let costo = 0;
        let ocultoValido = true;
        for (const componente of oculto.componentes) {
          const cantidadOculta = cantidadDesdeFormula(componente.formulaCantidad, componente.factor);
          const precioOculto = precioRecursoPresupuesto(componente.tipo, componente.recursoId, datos.apus, datos.recursos);
          if (!Number.isFinite(cantidadOculta) || precioOculto === null) {
            ocultoValido = false;
            break;
          }
          costo += cantidadOculta * precioOculto;
        }
        if (!ocultoValido) {
          completo = false;
          advertencias.push(`${codigo}: no se pudo calcular el costo oculto “${oculto.descripcion}”.`);
        }
        filas.push({ tipo: "oculto", codigo: "", descripcion: `- ${oculto.descripcion}`, unidad: "gl", cantidad: ocultoValido ? 1 : null, precioUnitario: ocultoValido ? costo : null, importe: ocultoValido ? costo : null, incidencia: null });
      }
    }
    return { codigo: codigoRubro, nombre: rubro.nombre, filas, subtotal: filas.reduce((suma, fila) => suma + (fila.importe ?? 0), 0), completo };
  });
  const total = rubros.reduce((suma, rubro) => suma + rubro.subtotal, 0);
  for (const rubro of rubros) for (const fila of rubro.filas) fila.incidencia = fila.importe !== null && total !== 0 ? fila.importe / total : fila.importe === 0 ? 0 : null;
  return { rubros, total, completo: rubros.every((rubro) => rubro.completo), advertencias };
}

type UsoRecurso = { partida: string; tipo: Exclude<TipoComponenteApu, "APU">; recursoId: number; cantidad: number; origen: string };

function explotarApuParaInforme(
  apuId: number,
  coeficiente: number,
  apus: Apu[],
  usos: UsoRecurso[],
  advertencias: string[],
  partida: string,
  ruta: string[],
  visitados = new Set<number>()
) {
  const apu = apus.find((actual) => actual.id === apuId);
  if (!apu) {
    advertencias.push(`${partida}: no existe el APU ${apuId}.`);
    return;
  }
  if (visitados.has(apuId)) {
    advertencias.push(`${partida}: referencia circular en ${[...ruta, apu.codigo].join(" > ")}.`);
    return;
  }
  const siguientes = new Set(visitados).add(apuId);
  for (const componente of [...apu.componentes].sort((a, b) => a.orden - b.orden)) {
    const cantidad = cantidadComponente(componente);
    if (!Number.isFinite(cantidad)) {
      advertencias.push(`${partida}: fórmula inválida en ${apu.codigo}, componente ${componente.id}.`);
      continue;
    }
    if (componente.tipo === "APU") {
      explotarApuParaInforme(componente.recursoId, coeficiente * cantidad, apus, usos, advertencias, partida, [...ruta, apu.codigo], siguientes);
    } else {
      usos.push({ partida, tipo: componente.tipo, recursoId: componente.recursoId, cantidad: coeficiente * cantidad, origen: [...ruta, apu.codigo].join(" > ") });
    }
  }
}

function usosExplotados(datos: DatosLegajo, advertencias: string[]) {
  const usos: UsoRecurso[] = [];
  for (const partida of datos.partidas) {
    const codigo = codigoPartida(partida, datos.rubros);
    const cantidad = cantidadDesdeFormula(partida.formulaCantidad);
    if (!Number.isFinite(cantidad)) {
      advertencias.push(`${codigo}: la fórmula de cantidad está vacía o es inválida.`);
    } else if (partida.tipo === "APU") {
      explotarApuParaInforme(partida.recursoId, cantidad, datos.apus, usos, advertencias, codigo, []);
    } else {
      usos.push({ partida: codigo, tipo: partida.tipo, recursoId: partida.recursoId, cantidad, origen: "Partida directa" });
    }
    for (const oculto of partida.ocultos ?? []) {
      for (const componente of oculto.componentes) {
        const cantidadOculta = cantidadDesdeFormula(componente.formulaCantidad, componente.factor);
        if (!Number.isFinite(cantidadOculta)) {
          advertencias.push(`${codigo}: fórmula inválida en el costo oculto “${oculto.descripcion}”.`);
        } else if (componente.tipo === "APU") {
          explotarApuParaInforme(componente.recursoId, cantidadOculta, datos.apus, usos, advertencias, codigo, [`Oculto: ${oculto.descripcion}`]);
        } else {
          usos.push({ partida: codigo, tipo: componente.tipo, recursoId: componente.recursoId, cantidad: cantidadOculta, origen: `Oculto: ${oculto.descripcion}` });
        }
      }
    }
  }
  return usos;
}

export function crearInformeLegajo(tipo: TipoInformeLegajo, datos: DatosLegajo): InformeLegajo {
  const advertencias: string[] = [];
  const rubrosOrdenados = [...datos.rubros].sort((a, b) => a.orden - b.orden);

  if (tipo === "previsto") {
    const secciones = rubrosOrdenados.map((rubro) => {
      const filas = datos.partidas.filter((partida) => partida.rubroId === rubro.id).sort((a, b) => a.codigo - b.codigo).map((partida) => {
        const calculo = calcularPartida(partida, datos.apus, datos.recursos);
        if (!calculo) advertencias.push(`${codigoPartida(partida, datos.rubros)}: no se pudo calcular por fórmula o referencia inválida.`);
        return {
          Código: codigoPartida(partida, datos.rubros),
          Descripción: nombrePartida(partida, datos.apus, datos.recursos),
          Fórmula: partida.formulaCantidad,
          Cantidad: calculo?.cantidad ?? "Error",
          Unidad: partida.tipo === "APU" ? datos.apus.find((apu) => apu.id === partida.recursoId)?.unidad ?? "" : datos.recursos.find((recurso) => recurso.tipo === partida.tipo && recurso.id === partida.recursoId)?.unidad ?? "",
          "Precio unitario": calculo?.precioConsolidado ?? calculo?.precio ?? "Error",
          "Costos ocultos": calculo?.ocultos ?? "Error",
          Importe: calculo?.consolidado ?? "Error",
        };
      });
      return { titulo: rubro.nombre, columnas: ["Código", "Descripción", "Fórmula", "Cantidad", "Unidad", "Precio unitario", "Costos ocultos", "Importe"], filas };
    });
    const total = datos.partidas.reduce((suma, partida) => suma + (calcularPartida(partida, datos.apus, datos.recursos)?.consolidado ?? 0), 0);
    return { titulo: "Costo previsto", descripcion: "Presupuesto vigente agrupado por rubros, con costos ocultos incluidos.", secciones, advertencias, total };
  }

  const usos = usosExplotados(datos, advertencias);
  const filasDetalladas = usos.map((uso) => {
    const recurso = datos.recursos.find((actual) => actual.tipo === uso.tipo && actual.id === uso.recursoId);
    if (!recurso) advertencias.push(`${uso.partida}: no existe el recurso ${uso.tipo}-${uso.recursoId}.`);
    return {
      Partida: uso.partida,
      Origen: uso.origen,
      Tipo: nombresTipo[uso.tipo],
      Código: recurso?.codigo ?? "No encontrado",
      Descripción: recurso?.nombre ?? "Recurso inexistente",
      Unidad: recurso?.unidad ?? "",
      Cantidad: uso.cantidad,
      "Precio unitario": recurso?.precio ?? "Error",
      Importe: recurso ? uso.cantidad * recurso.precio : "Error",
    };
  });

  if (tipo === "explotado") {
    const secciones = rubrosOrdenados.map((rubro) => {
      const codigos = new Set(datos.partidas.filter((partida) => partida.rubroId === rubro.id).map((partida) => codigoPartida(partida, datos.rubros)));
      return { titulo: rubro.nombre, columnas: ["Partida", "Origen", "Tipo", "Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Importe"], filas: filasDetalladas.filter((fila) => codigos.has(String(fila.Partida))) };
    });
    const total = filasDetalladas.reduce((suma, fila) => suma + (typeof fila.Importe === "number" ? fila.Importe : 0), 0);
    return { titulo: "Costo explotado", descripcion: "Detalle de recursos de cada partida, subanálisis y costos ocultos.", secciones, advertencias, total };
  }

  const consolidados = new Map<string, { tipo: Exclude<TipoComponenteApu, "APU">; recursoId: number; cantidad: number }>();
  for (const uso of usos) {
    const clave = `${uso.tipo}-${uso.recursoId}`;
    const actual = consolidados.get(clave);
    consolidados.set(clave, { tipo: uso.tipo, recursoId: uso.recursoId, cantidad: (actual?.cantidad ?? 0) + uso.cantidad });
  }
  const grupos = new Map<string, FilaInforme[]>();
  for (const consolidado of consolidados.values()) {
    const recurso = datos.recursos.find((actual) => actual.tipo === consolidado.tipo && actual.id === consolidado.recursoId);
    if (!recurso) continue;
    const familia = consolidado.tipo === "INS" ? datos.familiasInsumos.find((actual) => actual.recursoId === consolidado.recursoId)?.nombre ?? "Sin categoría" : "Sin familia";
    const grupo = `${nombresTipo[consolidado.tipo]} · ${familia}`;
    const filas = grupos.get(grupo) ?? [];
    filas.push({ Código: recurso.codigo, Descripción: recurso.nombre, Unidad: recurso.unidad, Cantidad: consolidado.cantidad, "Precio unitario": recurso.precio, Importe: consolidado.cantidad * recurso.precio });
    grupos.set(grupo, filas);
  }
  const secciones = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "es")).map(([titulo, filas]) => ({ titulo, columnas: ["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Importe"], filas: filas.sort((a, b) => String(a.Descripción).localeCompare(String(b.Descripción), "es")) }));
  const total = secciones.flatMap((seccion) => seccion.filas).reduce((suma, fila) => suma + Number(fila.Importe), 0);
  return { titulo: "Explosión de insumos", descripcion: "Consolidado de insumos, mano de obra, equipos, subcontratos y constantes intervinientes.", secciones, advertencias, total };
}

export function sanitizarNombreArchivo(nombre: string) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/[. ]+$/g, "").slice(0, 180) || "CTRL_S_Legajo";
}
