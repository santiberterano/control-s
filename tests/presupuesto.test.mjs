import assert from "node:assert/strict";
import test from "node:test";
import { calcularPartida, calcularResumenCostoPrevisto, cantidadDesdeFormula } from "../app/proyectos/[id]/componentes/presupuesto.ts";
import { calcularCostoApu, explotarApu } from "../app/proyectos/[id]/componentes/apu.ts";

const recursos=[
 {id:1,tipo:"INS",codigo:"MAM-001",nombre:"Mampostería",unidad:"m2",precio:30000},
 {id:2,tipo:"ALQ",codigo:"EQ-001",nombre:"Flete",unidad:"viaje",precio:80000},
 {id:3,tipo:"INS",codigo:"INS-003",nombre:"Consumibles",unidad:"u",precio:8000},
];
const partida={id:1,rubroId:1,codigo:1,tipo:"INS",recursoId:1,descripcionAlternativa:"",cantidad:999,formulaCantidad:"120",ocultos:[
 {id:10,descripcion:"Fletes",componentes:[{id:11,tipo:"ALQ",recursoId:2,cantidad:999,formulaCantidad:"2",factor:1,orden:0}]},
 {id:20,descripcion:"Consumibles",componentes:[{id:21,tipo:"INS",recursoId:3,cantidad:999,formulaCantidad:"5",factor:1,orden:0}]},
]};

test("consolida ocultos independientes sin multiplicarlos por la cantidad madre",()=>{
 const c=calcularPartida(partida,[],recursos);
 assert.deepEqual(c,{cantidad:120,precio:30000,propio:3600000,ocultos:200000,consolidado:3800000,precioConsolidado:3800000/120});
});
test("recalcula con el precio vigente de la biblioteca",()=>{
 const actualizados=recursos.map(r=>r.id===1?{...r,precio:31000}:r);
 assert.equal(calcularPartida(partida,[],actualizados).consolidado,3920000);
});
test("conserva el importe oculto si la cantidad madre es cero y evita dividir por cero",()=>{
 const c=calcularPartida({...partida,cantidad:999,formulaCantidad:"0"},[],recursos);
 assert.equal(c.consolidado,200000);assert.equal(c.precioConsolidado,null);
});
test("la cantidad proviene exclusivamente de la fórmula y admite paréntesis sin igual",()=>{
 assert.equal(cantidadDesdeFormula("(10 + 2) * 3"),36);
 assert.equal(cantidadDesdeFormula("=(10 + 2) * 3"),36);
 assert.ok(Number.isNaN(cantidadDesdeFormula("")));
 assert.ok(Number.isNaN(cantidadDesdeFormula("10 +")));
});

const apus=[
 {id:10,codigo:"APU-010",descripcion:"Simple",unidad:"m2",modificado:"",orden:0,componentes:[{id:101,tipo:"INS",recursoId:1,cantidad:999,formulaCantidad:"=2",factor:1,orden:0}]},
 {id:20,codigo:"APU-020",descripcion:"Compuesto",unidad:"m2",modificado:"",orden:1,componentes:[{id:201,tipo:"APU",recursoId:10,cantidad:999,formulaCantidad:"=3",factor:1,orden:0}]},
 {id:30,codigo:"APU-030",descripcion:"Multinivel",unidad:"u",modificado:"",orden:2,componentes:[{id:301,tipo:"APU",recursoId:20,cantidad:999,formulaCantidad:"=2",factor:1,orden:0}]},
];

test("calcula recurso directo, APU simple y varios niveles sin duplicar componentes",()=>{
 assert.equal(calcularPartida({...partida,ocultos:[]},apus,recursos).precio,30000);
 assert.equal(calcularCostoApu(10,apus,recursos),60000);
 assert.equal(calcularCostoApu(20,apus,recursos),180000);
 assert.equal(calcularCostoApu(30,apus,recursos),360000);
 const partidaApu={...partida,tipo:"APU",recursoId:30,formulaCantidad:"2",ocultos:[]};
 assert.equal(calcularPartida(partidaApu,apus,recursos).consolidado,720000);
});

test("un APU explotado conserva el mismo costo económico",()=>{
 let siguiente=1000;
 const componentes=explotarApu(30,apus,1,()=>siguiente++);
 const explotado={id:40,codigo:"EXP",descripcion:"Explotado",unidad:"u",modificado:"",orden:3,componentes};
 assert.equal(calcularCostoApu(40,[...apus,explotado],recursos),calcularCostoApu(30,apus,recursos));
});

test("un costo oculto puede contener un APU y mantiene su cantidad independiente",()=>{
 const conApu={...partida,formulaCantidad:"1",ocultos:[{id:30,descripcion:"Análisis oculto",componentes:[{id:31,tipo:"APU",recursoId:10,cantidad:999,formulaCantidad:"4",factor:1,orden:0}]}]};
 const calculo=calcularPartida(conApu,apus,recursos);
 assert.equal(calculo.propio,30000);
 assert.equal(calculo.ocultos,240000);
 assert.equal(calculo.consolidado,270000);
});

test("el resumen concilia propios más ocultos con rubros y total general",()=>{
 const rubros=[{id:1,nombre:"Uno",orden:0},{id:2,nombre:"Dos",orden:1}];
 const segunda={...partida,id:2,rubroId:2,codigo:1,formulaCantidad:"2",ocultos:[]};
 const resumen=calcularResumenCostoPrevisto([partida,segunda],rubros,apus,recursos);
 assert.equal(resumen.importePropio,3660000);
 assert.equal(resumen.costosOcultos,200000);
 assert.deepEqual(resumen.rubros.map(r=>r.subtotal),[3800000,60000]);
 assert.equal(resumen.total,3860000);
 assert.equal(resumen.total,resumen.importePropio+resumen.costosOcultos);
});

test("eliminar o reordenar partidas no deja importes acumulados",()=>{
 const rubros=[{id:1,nombre:"Uno",orden:0}];
 const segunda={...partida,id:2,codigo:2,formulaCantidad:"1",ocultos:[]};
 const inicial=calcularResumenCostoPrevisto([partida,segunda],rubros,apus,recursos);
 const reordenada=calcularResumenCostoPrevisto([{...segunda,codigo:0},{...partida,codigo:1}],rubros,apus,recursos);
 const eliminada=calcularResumenCostoPrevisto([partida],rubros,apus,recursos);
 assert.equal(reordenada.total,inicial.total);
 assert.equal(eliminada.total,3800000);
});

test("cambios de fórmula y precio se propagan sin usar cantidades guardadas",()=>{
 const base=calcularPartida({...partida,ocultos:[],cantidad:999,formulaCantidad:"2*3"},apus,recursos);
 const precioNuevo=calcularPartida({...partida,ocultos:[],cantidad:999,formulaCantidad:"3*3"},apus,recursos.map(r=>r.id===1?{...r,precio:31000}:r));
 assert.equal(base.consolidado,180000);
 assert.equal(precioNuevo.consolidado,279000);
});

test("cantidad cero es válida y una fórmula inválida marca el resumen incompleto",()=>{
 const rubros=[{id:1,nombre:"Uno",orden:0}];
 const cero=calcularPartida({...partida,formulaCantidad:"0"},apus,recursos);
 assert.equal(cero.consolidado,200000);
 assert.equal(cero.precioConsolidado,null);
 const invalida=calcularResumenCostoPrevisto([{...partida,formulaCantidad:"10+"}],rubros,apus,recursos);
 assert.equal(invalida.completo,false);
 assert.equal(invalida.partidas[0].calculo,null);
});
