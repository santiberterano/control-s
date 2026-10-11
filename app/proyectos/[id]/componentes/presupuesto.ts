import { calcularCostoApu, cantidadComponente, type Apu, type ComponenteApu, type RecursoApu, type TipoComponenteApu } from "./apu.ts";

export type RubroPresupuesto = { id:number; nombre:string; orden:number };
export type ItemOculto = { id:number; descripcion:string; componentes:ComponenteApu[] };
export type PartidaPresupuesto = { id:number; rubroId:number; codigo:number; tipo:Exclude<TipoComponenteApu,"CON">; recursoId:number; descripcionAlternativa:string; cantidad:number; formulaCantidad:string; ocultos:ItemOculto[] };

export function precioRecursoPresupuesto(tipo:TipoComponenteApu,recursoId:number,apus:Apu[],recursos:RecursoApu[]) {
  return tipo==="APU" ? calcularCostoApu(recursoId,apus,recursos) : recursos.find(r=>r.tipo===tipo&&r.id===recursoId)?.precio ?? null;
}
export function cantidadPresupuesto(registro:{cantidad:number;formulaCantidad:string}) { return cantidadComponente({...registro,id:0,tipo:"INS",recursoId:0,factor:1,orden:0}); }
export function costoOcultos(ocultos:ItemOculto[],apus:Apu[],recursos:RecursoApu[]) { let total=0; for(const hijo of ocultos) for(const componente of hijo.componentes){const cantidad=cantidadComponente(componente),precio=precioRecursoPresupuesto(componente.tipo,componente.recursoId,apus,recursos);if(!Number.isFinite(cantidad)||precio===null)return null;total+=cantidad*precio;} return total; }
export function calcularPartida(partida:PartidaPresupuesto,apus:Apu[],recursos:RecursoApu[]){const cantidad=cantidadPresupuesto(partida),precio=precioRecursoPresupuesto(partida.tipo,partida.recursoId,apus,recursos),ocultos=costoOcultos(partida.ocultos??[],apus,recursos);if(!Number.isFinite(cantidad)||precio===null||ocultos===null)return null;const propio=cantidad*precio,consolidado=propio+ocultos;return {cantidad,precio,propio,ocultos,consolidado,precioConsolidado:cantidad!==0?consolidado/cantidad:null};}
