import { cantidadComponente, calcularCostoApu, type Apu, type RecursoApu, type TipoComponenteApu } from "./apu.ts";
import { cantidadDesdeFormula, precioRecursoPresupuesto } from "./presupuesto.ts";
import { crearModeloCostoPrevisto, type DatosLegajo, type FamiliaRecurso } from "./legajo.ts";

export type ComponenteAnalisis = { nivel: number; tipo: TipoComponenteApu; codigo: string; descripcion: string; unidad: string; coeficiente: number | null; precioUnitario: number | null; importe: number | null };
export type AnalisisJerarquico = { nivel: number; codigo: string; descripcion: string; unidad: string; coeficientePadre: number; costoUnitario: number | null; incidenciaPadre: number | null; componentes: ComponenteAnalisis[]; subanalisis: AnalisisJerarquico[] };
export type OcultoExplotado = { descripcion: string; componentes: ComponenteAnalisis[]; analisis: AnalisisJerarquico[]; total: number | null };
export type PartidaExplotada = { codigo: string; descripcion: string; unidad: string; cantidad: number | null; precioUnitario: number | null; importePropio: number | null; ocultos: OcultoExplotado[]; analisis: AnalisisJerarquico | null; total: number | null };
export type RubroExplotado = { codigo: string; nombre: string; partidas: PartidaExplotada[]; subtotal: number; completo: boolean };
export type ModeloCostoExplotado = { rubros: RubroExplotado[]; total: number; completo: boolean; advertencias: string[] };

function recursoDe(tipo: TipoComponenteApu, id: number, apus: Apu[], recursos: RecursoApu[]) {
  if (tipo === "APU") {
    const apu = apus.find((actual) => actual.id === id);
    return apu ? { codigo: apu.codigo, descripcion: apu.descripcion, unidad: apu.unidad, precio: calcularCostoApu(id, apus, recursos) } : null;
  }
  const recurso = recursos.find((actual) => actual.tipo === tipo && actual.id === id);
  return recurso ? { codigo: recurso.codigo, descripcion: recurso.nombre, unidad: recurso.unidad, precio: recurso.precio } : null;
}

function analizarApu(apuId: number, coeficientePadre: number, nivel: number, datos: DatosLegajo, advertencias: string[], contexto: string, visitados = new Set<number>()): AnalisisJerarquico | null {
  const apu = datos.apus.find((actual) => actual.id === apuId);
  if (!apu) { advertencias.push(`${contexto}: APU inexistente.`); return null; }
  if (visitados.has(apuId)) { advertencias.push(`${contexto}: referencia circular en ${apu.codigo}.`); return null; }
  const siguientes = new Set(visitados).add(apuId);
  const componentes: ComponenteAnalisis[] = [];
  const subanalisis: AnalisisJerarquico[] = [];
  for (const componente of [...apu.componentes].sort((a, b) => a.orden - b.orden)) {
    const recurso = recursoDe(componente.tipo, componente.recursoId, datos.apus, datos.recursos);
    const coeficiente = cantidadComponente(componente);
    const valido = recurso && Number.isFinite(coeficiente) && recurso.precio !== null;
    if (!valido) advertencias.push(`${contexto}: componente inválido en ${apu.codigo}.`);
    componentes.push({ nivel, tipo: componente.tipo, codigo: recurso?.codigo ?? "Error", descripcion: recurso?.descripcion ?? "Recurso inexistente", unidad: recurso?.unidad ?? "", coeficiente: Number.isFinite(coeficiente) ? coeficiente : null, precioUnitario: recurso?.precio ?? null, importe: valido ? coeficiente * recurso.precio! : null });
    if (componente.tipo === "APU" && Number.isFinite(coeficiente)) {
      const hijo = analizarApu(componente.recursoId, coeficiente, nivel + 1, datos, advertencias, contexto, siguientes);
      if (hijo) subanalisis.push(hijo);
    }
  }
  const costo = calcularCostoApu(apuId, datos.apus, datos.recursos);
  return { nivel, codigo: apu.codigo, descripcion: apu.descripcion, unidad: apu.unidad, coeficientePadre, costoUnitario: costo, incidenciaPadre: costo === null ? null : costo * coeficientePadre, componentes, subanalisis };
}

export function crearModeloCostoExplotado(datos: DatosLegajo): ModeloCostoExplotado {
  const previsto = crearModeloCostoPrevisto(datos);
  const advertencias = [...previsto.advertencias];
  const rubros = [...datos.rubros].sort((a, b) => a.orden - b.orden).map((rubro) => {
    const codigoRubro = String(rubro.orden + 1).padStart(2, "0");
    const partidas = datos.partidas.filter((partida) => partida.rubroId === rubro.id).sort((a, b) => a.codigo - b.codigo).map((partida): PartidaExplotada => {
      const codigo = `${codigoRubro}.${partida.codigo}`;
      const cantidad = cantidadDesdeFormula(partida.formulaCantidad);
      const recurso = recursoDe(partida.tipo, partida.recursoId, datos.apus, datos.recursos);
      const precio = precioRecursoPresupuesto(partida.tipo, partida.recursoId, datos.apus, datos.recursos);
      const valido = Number.isFinite(cantidad) && precio !== null && recurso;
      const analisis = partida.tipo === "APU" ? analizarApu(partida.recursoId, 1, 0, datos, advertencias, codigo) : null;
      const ocultos = (partida.ocultos ?? []).map((oculto): OcultoExplotado => {
        const componentes: ComponenteAnalisis[] = [];
        const analisisOcultos: AnalisisJerarquico[] = [];
        let total = 0;
        let completo = true;
        for (const componente of oculto.componentes) {
          const recursoOculto = recursoDe(componente.tipo, componente.recursoId, datos.apus, datos.recursos);
          const coeficiente = cantidadDesdeFormula(componente.formulaCantidad, componente.factor);
          const precioOculto = precioRecursoPresupuesto(componente.tipo, componente.recursoId, datos.apus, datos.recursos);
          const componenteValido = recursoOculto && Number.isFinite(coeficiente) && precioOculto !== null;
          if (!componenteValido) completo = false; else total += coeficiente * precioOculto;
          componentes.push({ nivel: 0, tipo: componente.tipo, codigo: recursoOculto?.codigo ?? "Error", descripcion: recursoOculto?.descripcion ?? "Recurso inexistente", unidad: recursoOculto?.unidad ?? "", coeficiente: Number.isFinite(coeficiente) ? coeficiente : null, precioUnitario: precioOculto, importe: componenteValido ? coeficiente * precioOculto! : null });
          if (componente.tipo === "APU" && Number.isFinite(coeficiente)) { const detalle = analizarApu(componente.recursoId, coeficiente, 1, datos, advertencias, `${codigo} - ${oculto.descripcion}`); if (detalle) analisisOcultos.push(detalle); }
        }
        if (!completo) { advertencias.push(`${codigo}: costo oculto inválido: ${oculto.descripcion}.`); return { descripcion: oculto.descripcion, componentes, analisis: analisisOcultos, total: null }; }
        return { descripcion: oculto.descripcion, componentes, analisis: analisisOcultos, total };
      });
      const ocultosTotal = ocultos.reduce((suma, oculto) => suma + (oculto.total ?? 0), 0);
      const importePropio = valido ? cantidad * precio : null;
      return { codigo, descripcion: partida.descripcionAlternativa.trim() || recurso?.descripcion || "Recurso inexistente", unidad: recurso?.unidad ?? "", cantidad: Number.isFinite(cantidad) ? cantidad : null, precioUnitario: precio, importePropio, ocultos, analisis, total: importePropio === null || ocultos.some((oculto) => oculto.total === null) ? null : importePropio + ocultosTotal };
    });
    return { codigo: codigoRubro, nombre: rubro.nombre, partidas, subtotal: partidas.reduce((suma, partida) => suma + (partida.total ?? 0), 0), completo: partidas.every((partida) => partida.total !== null) };
  });
  return { rubros, total: rubros.reduce((suma, rubro) => suma + rubro.subtotal, 0), completo: rubros.every((rubro) => rubro.completo), advertencias: [...new Set(advertencias)] };
}

type TipoBasico = Exclude<TipoComponenteApu, "APU">;
export type RecursoConsolidado = { tipo: TipoBasico; familia: string; id: number; codigo: string; descripcion: string; unidad: string; cantidad: number; precioUnitario: number; total: number };
export type FamiliaExplosion = { nombre: string; recursos: RecursoConsolidado[]; subtotal: number };
export type GrupoExplosion = { tipo: TipoBasico; nombre: string; familias: FamiliaExplosion[]; subtotal: number };
export type ModeloExplosion = { grupos: GrupoExplosion[]; total: number; costoPrevisto: number; diferencia: number; completo: boolean; advertencias: string[] };

type Acumulado = { tipo: TipoBasico; id: number; cantidad: number };
function acumularApu(apuId: number, factor: number, datos: DatosLegajo, acumulados: Map<string, Acumulado>, advertencias: string[], visitados = new Set<number>()) {
  const apu = datos.apus.find((actual) => actual.id === apuId);
  if (!apu || visitados.has(apuId)) { advertencias.push(!apu ? `APU ${apuId} inexistente.` : `Referencia circular en ${apu.codigo}.`); return; }
  const siguientes = new Set(visitados).add(apuId);
  for (const componente of apu.componentes) {
    const cantidad = cantidadComponente(componente);
    if (!Number.isFinite(cantidad)) { advertencias.push(`Fórmula inválida en ${apu.codigo}.`); continue; }
    if (componente.tipo === "APU") acumularApu(componente.recursoId, factor * cantidad, datos, acumulados, advertencias, siguientes);
    else { const clave = `${componente.tipo}-${componente.recursoId}`; const actual = acumulados.get(clave); acumulados.set(clave, { tipo: componente.tipo, id: componente.recursoId, cantidad: (actual?.cantidad ?? 0) + factor * cantidad }); }
  }
}

export function crearModeloExplosion(datos: DatosLegajo): ModeloExplosion {
  const advertencias: string[] = [];
  const acumulados = new Map<string, Acumulado>();
  for (const partida of datos.partidas) {
    const cantidad = cantidadDesdeFormula(partida.formulaCantidad);
    if (!Number.isFinite(cantidad)) { advertencias.push(`Partida ${partida.codigo}: fórmula inválida.`); continue; }
    if (partida.tipo === "APU") acumularApu(partida.recursoId, cantidad, datos, acumulados, advertencias);
    else { const clave = `${partida.tipo}-${partida.recursoId}`; const actual = acumulados.get(clave); acumulados.set(clave, { tipo: partida.tipo, id: partida.recursoId, cantidad: (actual?.cantidad ?? 0) + cantidad }); }
    for (const oculto of partida.ocultos ?? []) for (const componente of oculto.componentes) {
      const cantidadOculta = cantidadDesdeFormula(componente.formulaCantidad, componente.factor);
      if (!Number.isFinite(cantidadOculta)) { advertencias.push(`Costo oculto ${oculto.descripcion}: fórmula inválida.`); continue; }
      if (componente.tipo === "APU") acumularApu(componente.recursoId, cantidadOculta, datos, acumulados, advertencias);
      else { const clave = `${componente.tipo}-${componente.recursoId}`; const actual = acumulados.get(clave); acumulados.set(clave, { tipo: componente.tipo, id: componente.recursoId, cantidad: (actual?.cantidad ?? 0) + cantidadOculta }); }
    }
  }
  const nombres: Record<TipoBasico, string> = { INS: "INSUMOS", MDO: "MANO DE OBRA", ALQ: "EQUIPOS", SUB: "SUBCONTRATOS", CON: "NO CLASIFICADOS" };
  const orden: TipoBasico[] = ["INS", "MDO", "ALQ", "SUB", "CON"];
  const recursos = [...acumulados.values()].flatMap((acumulado) => {
    const recurso = datos.recursos.find((actual) => actual.tipo === acumulado.tipo && actual.id === acumulado.id);
    if (!recurso) { advertencias.push(`Recurso ${acumulado.tipo}-${acumulado.id} inexistente.`); return []; }
    if (acumulado.tipo === "CON") advertencias.push(`La constante ${recurso.codigo} interviene como componente con costo y se informa en NO CLASIFICADOS.`);
    const familia = acumulado.tipo === "INS" ? datos.familiasInsumos.find((actual: FamiliaRecurso) => actual.recursoId === acumulado.id)?.nombre ?? "Sin categoría" : "Sin familia";
    return [{ tipo: acumulado.tipo, familia, id: acumulado.id, codigo: recurso.codigo, descripcion: recurso.nombre, unidad: recurso.unidad, cantidad: acumulado.cantidad, precioUnitario: recurso.precio, total: acumulado.cantidad * recurso.precio }];
  });
  const grupos = orden.flatMap((tipo) => {
    const delTipo = recursos.filter((recurso) => recurso.tipo === tipo);
    if (!delTipo.length) return [];
    const familias = [...new Set(delTipo.map((recurso) => recurso.familia))].sort((a, b) => a.localeCompare(b, "es")).map((familia) => { const filas = delTipo.filter((recurso) => recurso.familia === familia).sort((a, b) => a.codigo.localeCompare(b.codigo, "es")); return { nombre: familia, recursos: filas, subtotal: filas.reduce((suma, recurso) => suma + recurso.total, 0) }; });
    return [{ tipo, nombre: nombres[tipo], familias, subtotal: familias.reduce((suma, familia) => suma + familia.subtotal, 0) }];
  });
  const total = grupos.reduce((suma, grupo) => suma + grupo.subtotal, 0);
  const previsto = crearModeloCostoPrevisto(datos);
  const diferencia = total - previsto.total;
  if (Math.abs(diferencia) > 0.01) advertencias.push(`Diferencia de conciliación: ${diferencia.toFixed(2)}.`);
  return { grupos, total, costoPrevisto: previsto.total, diferencia, completo: previsto.completo && advertencias.every((advertencia) => !advertencia.includes("inválid") && !advertencia.includes("inexistente") && !advertencia.includes("circular")), advertencias: [...new Set(advertencias)] };
}
