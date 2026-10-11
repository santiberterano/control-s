import assert from "node:assert/strict";
import test from "node:test";
import { calcularPartida } from "../app/proyectos/[id]/componentes/presupuesto.ts";

const recursos=[
 {id:1,tipo:"INS",codigo:"MAM-001",nombre:"Mampostería",unidad:"m2",precio:30000},
 {id:2,tipo:"ALQ",codigo:"EQ-001",nombre:"Flete",unidad:"viaje",precio:80000},
 {id:3,tipo:"INS",codigo:"INS-003",nombre:"Consumibles",unidad:"u",precio:8000},
];
const partida={id:1,rubroId:1,codigo:1,tipo:"INS",recursoId:1,descripcionAlternativa:"",cantidad:120,formulaCantidad:"",ocultos:[
 {id:10,descripcion:"Fletes",componentes:[{id:11,tipo:"ALQ",recursoId:2,cantidad:2,formulaCantidad:"",factor:1,orden:0}]},
 {id:20,descripcion:"Consumibles",componentes:[{id:21,tipo:"INS",recursoId:3,cantidad:5,formulaCantidad:"",factor:1,orden:0}]},
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
 const c=calcularPartida({...partida,cantidad:0},[],recursos);
 assert.equal(c.consolidado,200000);assert.equal(c.precioConsolidado,null);
});
