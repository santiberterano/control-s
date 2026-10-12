import { calcularCostoApu, type Apu, type ComponenteApu, type RecursoApu, type TipoComponenteApu } from "./apu.ts";
import { evaluarOperacion } from "./calculosRecursos.ts";

export type RubroPresupuesto = { id:number; nombre:string; orden:number };
export type ItemOculto = { id:number; descripcion:string; componentes:ComponenteApu[] };
export type PartidaPresupuesto = { id:number; rubroId:number; codigo:number; tipo:Exclude<TipoComponenteApu,"CON">; recursoId:number; descripcionAlternativa:string; cantidad:number; formulaCantidad:string; ocultos:ItemOculto[] };
export type CalculoPartida = { cantidad:number; precio:number; propio:number; ocultos:number; consolidado:number; precioConsolidado:number|null };
export type ResumenCostoPrevisto = {
  partidas: Array<{ partidaId:number; rubroId:number; calculo:CalculoPartida|null }>;
  rubros: Array<{ rubroId:number; subtotal:number; completo:boolean }>;
  importePropio:number;
  costosOcultos:number;
  total:number;
  completo:boolean;
};

export function precioRecursoPresupuesto(tipo:TipoComponenteApu,recursoId:number,apus:Apu[],recursos:RecursoApu[]) {
  return tipo==="APU" ? calcularCostoApu(recursoId,apus,recursos) : recursos.find(r=>r.tipo===tipo&&r.id===recursoId)?.precio ?? null;
}
export function cantidadDesdeFormula(formula:string,factor=1) { const texto=formula.trim();if(!texto)return Number.NaN;const valor=evaluarOperacion(texto.startsWith("=")?texto.slice(1):texto);return valor===null?Number.NaN:valor*factor; }
export function formulaPresupuestoValida(formula:string){return Number.isFinite(cantidadDesdeFormula(formula));}
export function cantidadPresupuesto(registro:{formulaCantidad:string}) { return cantidadDesdeFormula(registro.formulaCantidad); }
export function calcularCostoOculto(oculto:ItemOculto,apus:Apu[],recursos:RecursoApu[]) { let total=0; for(const componente of oculto.componentes){const cantidad=cantidadDesdeFormula(componente.formulaCantidad,componente.factor),precio=precioRecursoPresupuesto(componente.tipo,componente.recursoId,apus,recursos);if(!Number.isFinite(cantidad)||precio===null)return null;total+=cantidad*precio;} return total; }
export function costoOcultos(ocultos:ItemOculto[],apus:Apu[],recursos:RecursoApu[]) { let total=0; for(const oculto of ocultos){const costo=calcularCostoOculto(oculto,apus,recursos);if(costo===null)return null;total+=costo;} return total; }
export function calcularPartida(partida:PartidaPresupuesto,apus:Apu[],recursos:RecursoApu[]):CalculoPartida|null {const cantidad=cantidadPresupuesto(partida),precio=precioRecursoPresupuesto(partida.tipo,partida.recursoId,apus,recursos),ocultos=costoOcultos(partida.ocultos??[],apus,recursos);if(!Number.isFinite(cantidad)||precio===null||ocultos===null)return null;const propio=cantidad*precio,consolidado=propio+ocultos;return {cantidad,precio,propio,ocultos,consolidado,precioConsolidado:cantidad!==0?consolidado/cantidad:null};}

export function calcularResumenCostoPrevisto(partidas:PartidaPresupuesto[],rubros:RubroPresupuesto[],apus:Apu[],recursos:RecursoApu[]):ResumenCostoPrevisto {
  const resultados=partidas.map((partida)=>({partidaId:partida.id,rubroId:partida.rubroId,calculo:calcularPartida(partida,apus,recursos)}));
  const resumenRubros=rubros.map((rubro)=>{const delRubro=resultados.filter((resultado)=>resultado.rubroId===rubro.id);return {rubroId:rubro.id,subtotal:delRubro.reduce((suma,resultado)=>suma+(resultado.calculo?.consolidado??0),0),completo:delRubro.every((resultado)=>resultado.calculo!==null)};});
  return {
    partidas:resultados,
    rubros:resumenRubros,
    importePropio:resultados.reduce((suma,resultado)=>suma+(resultado.calculo?.propio??0),0),
    costosOcultos:resultados.reduce((suma,resultado)=>suma+(resultado.calculo?.ocultos??0),0),
    total:resumenRubros.reduce((suma,rubro)=>suma+rubro.subtotal,0),
    completo:resultados.every((resultado)=>resultado.calculo!==null),
  };
}
