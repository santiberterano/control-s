import { evaluarOperacion } from "./calculosRecursos.ts";

export type TipoComponenteApu = "APU" | "INS" | "MDO" | "ALQ" | "SUB" | "CON";

export type ComponenteApu = {
  id: number;
  tipo: TipoComponenteApu;
  recursoId: number;
  cantidad: number;
  formulaCantidad: string;
  factor: number;
  orden: number;
  modo?: "encapsulado";
};

export type Apu = {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  componentes: ComponenteApu[];
  modificado: string;
  orden: number;
};

export type RecursoApu = {
  id: number;
  tipo: Exclude<TipoComponenteApu, "APU">;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
};

export function cantidadComponente(componente: ComponenteApu) {
  const formula = componente.formulaCantidad.trim();
  const calculada = formula
    ? evaluarOperacion(formula.startsWith("=") ? formula.slice(1) : formula)
    : componente.cantidad;
  return (calculada ?? componente.cantidad) * componente.factor;
}

export function calcularCostoApu(
  apuId: number,
  apus: Apu[],
  recursos: RecursoApu[],
  visitados = new Set<number>()
): number | null {
  if (visitados.has(apuId)) return null;
  const apu = apus.find((actual) => actual.id === apuId);
  if (!apu) return null;
  const siguientes = new Set(visitados).add(apuId);
  let total = 0;

  for (const componente of [...apu.componentes].sort((a, b) => a.orden - b.orden)) {
    const cantidad = cantidadComponente(componente);
    const precio = componente.tipo === "APU"
      ? calcularCostoApu(componente.recursoId, apus, recursos, siguientes)
      : recursos.find(
          (recurso) => recurso.tipo === componente.tipo && recurso.id === componente.recursoId
        )?.precio ?? null;
    if (precio === null) return null;
    total += cantidad * precio;
  }

  return total;
}

export function creariaCiclo(apuDestinoId: number, apuOrigenId: number, apus: Apu[]) {
  function dependeDe(actualId: number, buscadoId: number, visitados: Set<number>): boolean {
    if (actualId === buscadoId) return true;
    if (visitados.has(actualId)) return false;
    const actual = apus.find((apu) => apu.id === actualId);
    if (!actual) return false;
    const siguientes = new Set(visitados).add(actualId);
    return actual.componentes.some(
      (componente) =>
        componente.tipo === "APU" && dependeDe(componente.recursoId, buscadoId, siguientes)
    );
  }
  return dependeDe(apuOrigenId, apuDestinoId, new Set());
}

export function explotarApu(
  origenId: number,
  apus: Apu[],
  coeficiente: number,
  crearId: () => number,
  visitados = new Set<number>()
): ComponenteApu[] {
  if (visitados.has(origenId)) return [];
  const origen = apus.find((apu) => apu.id === origenId);
  if (!origen) return [];
  const siguientes = new Set(visitados).add(origenId);
  const resultado: ComponenteApu[] = [];

  for (const componente of [...origen.componentes].sort((a, b) => a.orden - b.orden)) {
    if (componente.tipo === "APU") {
      resultado.push(
        ...explotarApu(
          componente.recursoId,
          apus,
          coeficiente * cantidadComponente(componente),
          crearId,
          siguientes
        )
      );
    } else {
      resultado.push({
        ...componente,
        id: crearId(),
        factor: componente.factor * coeficiente,
        orden: resultado.length,
      });
    }
  }
  return resultado;
}
