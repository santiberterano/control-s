import { calcularCostoApu, type Apu, type ComponenteApu, type RecursoApu, type TipoComponenteApu } from "./apu.ts";
import { evaluarOperacion } from "./calculosRecursos.ts";

export type RubroPresupuesto = { id:number; nombre:string; orden:number };
export type ItemOculto = { id:number; descripcion:string; componentes:ComponenteApu[] };
export type PartidaPresupuesto = { id:number; rubroId:number; codigo:number; tipo:Exclude<TipoComponenteApu,"CON">; recursoId:number; descripcionAlternativa:string; cantidad:number; formulaCantidad:string; ocultos:ItemOculto[] };

export function precioRecursoPresupuesto(tipo:TipoComponenteApu,recursoId:number,apus:Apu[],recursos:RecursoApu[]) {
  return tipo==="APU" ? calcularCostoApu(recursoId,apus,recursos) : recursos.find(r=>r.tipo===tipo&&r.id===recursoId)?.precio ?? null;
}
export function cantidadDesdeFormula(formula:string,factor=1) { const texto=formula.trim();if(!texto)return Number.NaN;const valor=evaluarOperacion(texto.startsWith("=")?texto.slice(1):texto);return valor===null?Number.NaN:valor*factor; }
export function formulaPresupuestoValida(formula:string){return Number.isFinite(cantidadDesdeFormula(formula));}
export function cantidadPresupuesto(registro:{formulaCantidad:string}) { return cantidadDesdeFormula(registro.formulaCantidad); }
export function costoOcultos(ocultos:ItemOculto[],apus:Apu[],recursos:RecursoApu[]) { let total=0; for(const hijo of ocultos) for(const componente of hijo.componentes){const cantidad=cantidadDesdeFormula(componente.formulaCantidad,componente.factor),precio=precioRecursoPresupuesto(componente.tipo,componente.recursoId,apus,recursos);if(!Number.isFinite(cantidad)||precio===null)return null;total+=cantidad*precio;} return total; }
export function calcularPartida(partida:PartidaPresupuesto,apus:Apu[],recursos:RecursoApu[]){const cantidad=cantidadPresupuesto(partida),precio=precioRecursoPresupuesto(partida.tipo,partida.recursoId,apus,recursos),ocultos=costoOcultos(partida.ocultos??[],apus,recursos);if(!Number.isFinite(cantidad)||precio===null||ocultos===null)return null;const propio=cantidad*precio,consolidado=propio+ocultos;return {cantidad,precio,propio,ocultos,consolidado,precioConsolidado:cantidad!==0?consolidado/cantidad:null};}
