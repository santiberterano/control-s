"use client";

import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { type Apu, type ComponenteApu, type RecursoApu, calcularCostoApu, cantidadComponente, creariaCiclo, explotarApu } from "./apu";

type Props = { apus: Apu[]; setApus: React.Dispatch<React.SetStateAction<Apu[]>>; recursos: RecursoApu[] };
type Sugerencia = RecursoApu | { tipo: "APU"; id: number; codigo: string; nombre: string; unidad: string; precio: number };
type Menu = { clase: "apu" | "componente"; id: number; x: number; y: number };
const letras = { APU: "A", INS: "I", MDO: "M", ALQ: "E", SUB: "S", CON: "C" } as const;
const grilla = "grid-cols-[32px_38px_minmax(230px,1fr)_62px_88px_130px_112px_120px_40px]";

function hoy() { return new Intl.DateTimeFormat("es-AR").format(new Date()); }
function normalizar(texto: string) { return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase(); }
function moneda(valor: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(valor); }
function nuevoId(ids: number[]) { return Math.max(Date.now(), ...ids.map((id) => id + 1)); }

export default function VistaApu({ apus, setApus, recursos }: Props) {
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("u");
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState("");
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const [expandidos, setExpandidos] = useState(new Set<number>());
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const nuevoRef = useRef<HTMLInputElement>(null);
  const consultaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!menu) return; const cerrar = () => setMenu(null); window.addEventListener("click", cerrar); return () => window.removeEventListener("click", cerrar); }, [menu]);
  const abierto = apus.find((apu) => apu.id === abiertoId) ?? null;
  const visibles = useMemo(() => { const q = normalizar(busqueda); return [...apus].filter((apu) => !q || normalizar(`${apu.codigo} ${apu.descripcion}`).includes(q)).sort((a, b) => a.orden - b.orden); }, [apus, busqueda]);
  const sugerencias = useMemo<Sugerencia[]>(() => { const q = normalizar(consulta); if (!q) return []; return [...recursos, ...apus.filter((apu) => apu.id !== abiertoId).map((apu) => ({ tipo: "APU" as const, id: apu.id, codigo: apu.codigo, nombre: apu.descripcion, unidad: apu.unidad, precio: calcularCostoApu(apu.id, apus, recursos) ?? 0 }))].filter((r) => normalizar(`${r.codigo} ${r.nombre}`).includes(q)).slice(0, 10); }, [apus, abiertoId, consulta, recursos]);

  function actualizarApu(id: number, cambio: (apu: Apu) => Apu) { setApus((actuales) => actuales.map((apu) => apu.id === id ? { ...cambio(apu), modificado: hoy() } : apu)); }
  function crearApu() {
    const codigo = nuevoCodigo.trim(), descripcion = nuevaDescripcion.trim(), unidad = nuevaUnidad.trim();
    if (!codigo || !descripcion || !unidad) return setError("Completá código, descripción y unidad.");
    if (apus.some((apu) => normalizar(apu.codigo) === normalizar(codigo))) return setError("El código de APU ya existe.");
    const nuevo: Apu = { id: nuevoId(apus.map((a) => a.id)), codigo, descripcion, unidad, componentes: [], modificado: hoy(), orden: apus.length };
    setApus((actuales) => [...actuales, nuevo]); setNuevoCodigo(""); setNuevaDescripcion(""); setNuevaUnidad("u"); setSeleccionado(nuevo.id); setError(""); requestAnimationFrame(() => nuevoRef.current?.focus());
  }
  function duplicarApu(apu: Apu) {
    const base = `${apu.codigo}-COPIA`; let codigo = base, n = 2; while (apus.some((a) => normalizar(a.codigo) === normalizar(codigo))) codigo = `${base}-${n++}`;
    let secuencia = nuevoId(apus.flatMap((a) => a.componentes.map((c) => c.id)));
    const copia: Apu = { ...apu, id: nuevoId(apus.map((a) => a.id)), codigo, descripcion: `${apu.descripcion} (copia)`, componentes: apu.componentes.map((c) => ({ ...c, id: secuencia++ })), modificado: hoy(), orden: apus.length };
    setApus((actuales) => [...actuales, copia]); setSeleccionado(copia.id); setMenu(null);
  }
  function eliminarApu(apu: Apu) {
    const referencias = apus.filter((a) => a.componentes.some((c) => c.tipo === "APU" && c.recursoId === apu.id));
    if (referencias.length) { setError(`No se puede eliminar: lo usa ${referencias.map((a) => a.codigo).join(", ")}.`); setMenu(null); return; }
    if (!window.confirm(`¿Eliminar ${apu.codigo} · ${apu.descripcion}?`)) return;
    setApus((actuales) => actuales.filter((a) => a.id !== apu.id)); setSeleccionado(null); setMenu(null);
  }
  function agregar(recurso: Sugerencia, modoApu: "encapsulado" | "explotado" = "encapsulado") {
    if (!abierto) return;
    if (recurso.tipo === "APU" && creariaCiclo(abierto.id, recurso.id, apus)) return setError(`${recurso.codigo} generaría una referencia circular.`);
    let componenteId: number | null = null;
    if (recurso.tipo === "APU" && modoApu === "explotado") {
      let secuencia = nuevoId(abierto.componentes.map((c) => c.id)); const copiados = explotarApu(recurso.id, apus, 1, () => secuencia++);
      actualizarApu(abierto.id, (apu) => ({ ...apu, componentes: [...apu.componentes, ...copiados].map((c, orden) => ({ ...c, orden })) }));
    } else {
      componenteId = nuevoId(abierto.componentes.map((c) => c.id));
      const componente: ComponenteApu = { id: componenteId, tipo: recurso.tipo, recursoId: recurso.id, cantidad: 1, formulaCantidad: "", factor: 1, orden: abierto.componentes.length, ...(recurso.tipo === "APU" ? { modo: "encapsulado" as const } : {}) };
      actualizarApu(abierto.id, (apu) => ({ ...apu, componentes: [...apu.componentes, componente] }));
    }
    setConsulta(""); setError("");
    if (componenteId !== null) requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-cantidad='${componenteId}']`)?.focus());
    else requestAnimationFrame(() => consultaRef.current?.focus());
  }
  function teclado(event: KeyboardEvent<HTMLInputElement>) { if (event.key === "ArrowDown") { event.preventDefault(); setIndice((i) => Math.min(i + 1, sugerencias.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setIndice((i) => Math.max(i - 1, 0)); } else if (event.key === "Enter" && sugerencias[indice]) { event.preventDefault(); agregar(sugerencias[indice]); } else if (event.key === "Escape") setConsulta(""); }
  function actualizarComponente(id: number, cambios: Partial<ComponenteApu>) { if (abierto) actualizarApu(abierto.id, (apu) => ({ ...apu, componentes: apu.componentes.map((c) => c.id === id ? { ...c, ...cambios } : c) })); }
  function duplicarComponente(c: ComponenteApu) { if (!abierto) return; const copia = { ...c, id: nuevoId(abierto.componentes.map((x) => x.id)) }; actualizarApu(abierto.id, (apu) => { const cs = [...apu.componentes]; cs.splice(cs.findIndex((x) => x.id === c.id) + 1, 0, copia); return { ...apu, componentes: cs.map((x, orden) => ({ ...x, orden })) }; }); setMenu(null); }
  function eliminarComponente(id: number) { if (abierto) actualizarApu(abierto.id, (apu) => ({ ...apu, componentes: apu.componentes.filter((c) => c.id !== id).map((c, orden) => ({ ...c, orden })) })); setMenu(null); }
  function explotar(c: ComponenteApu) { if (!abierto || c.tipo !== "APU") return; let secuencia = nuevoId(abierto.componentes.map((x) => x.id)); const copias = explotarApu(c.recursoId, apus, cantidadComponente(c), () => secuencia++); actualizarApu(abierto.id, (apu) => { const cs = [...apu.componentes]; cs.splice(cs.findIndex((x) => x.id === c.id), 1, ...copias); return { ...apu, componentes: cs.map((x, orden) => ({ ...x, orden })) }; }); setMenu(null); }

  if (abierto) return <div>
    <div className="mb-4 flex items-end justify-between"><div><button type="button" onClick={() => { setAbiertoId(null); setError(""); }} className="mb-2 text-xs font-semibold text-zinc-500 hover:text-black">← Biblioteca APU</button><div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Composición del análisis</div><div className="mt-1 flex items-center gap-3"><span className="text-sm font-bold text-zinc-400">{abierto.codigo}</span>{editando === abierto.id ? <input autoFocus value={borrador} onChange={(e) => setBorrador(e.target.value)} onBlur={() => { if (borrador.trim()) actualizarApu(abierto.id, (a) => ({ ...a, descripcion: borrador.trim() })); setEditando(null); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditando(null); }} className="rounded border border-[#E6B012] px-2 py-1 text-xl font-bold outline-none" /> : <h1 onDoubleClick={() => { setBorrador(abierto.descripcion); setEditando(abierto.id); }} className="text-2xl font-bold text-zinc-900">{abierto.descripcion}</h1>}</div></div><div className="text-right"><div className="text-xs uppercase text-zinc-400">Precio unitario</div><div className="text-xl font-bold">{moneda(calcularCostoApu(abierto.id, apus, recursos) ?? 0)}</div><div className="text-xs text-zinc-500">por {abierto.unidad}</div></div></div>
    {error && <Aviso>{error}</Aviso>}
    <div className="overflow-x-auto rounded-lg border border-zinc-300 bg-white"><div className="min-w-[930px]"><div className={`grid ${grilla} border-b border-zinc-300 bg-[#f7f7f5] text-xs font-semibold uppercase text-zinc-500`}><Cab /><Cab>Tipo</Cab><Cab>Descripción</Cab><Cab>Un.</Cab><Cab>Cant.</Cab><Cab>Fórmula</Cab><Cab>P. unitario</Cab><Cab>Subtotal</Cab><Cab /></div>
      {[...abierto.componentes].sort((a,b) => a.orden-b.orden).map((c) => <Fila key={c.id} componente={c} nivel={0} apus={apus} recursos={recursos} expandidos={expandidos} seleccionado={seleccionado === c.id} onSeleccionar={() => setSeleccionado(c.id)} onAlternar={(id) => setExpandidos((xs) => { const n = new Set(xs); if (n.has(id)) n.delete(id); else n.add(id); return n; })} onCantidad={(cantidad) => { if (!Number.isFinite(cantidad) || cantidad < 0) return setError("Ingresá una cantidad válida."); actualizarComponente(c.id, { cantidad, formulaCantidad: "" }); setError(""); }} onFormula={(formulaCantidad) => { if (formulaCantidad.trim() && !formulaCantidad.trim().startsWith("=")) return setError("La fórmula debe comenzar con =."); actualizarComponente(c.id, { formulaCantidad: formulaCantidad.trim() }); setError(""); }} onMenu={(e) => { e.preventDefault(); setSeleccionado(c.id); setMenu({ clase: "componente", id: c.id, x: e.clientX, y: e.clientY }); }} />)}
      <div className={`grid ${grilla} bg-[#fffdf5]`}><div /><div className="flex items-center justify-center text-zinc-300">+</div><div className="relative p-1.5"><input ref={consultaRef} value={consulta} onChange={(e) => { setConsulta(e.target.value); setIndice(0); }} onKeyDown={teclado} placeholder="Agregar recurso o APU..." className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" />{sugerencias.length > 0 && <div className="absolute left-1 top-full z-30 max-h-56 w-[520px] overflow-auto rounded border border-zinc-300 bg-white py-1 shadow-lg">{sugerencias.map((s,i) => <div key={`${s.tipo}-${s.id}`} className={`flex items-center ${i === indice ? "bg-[#fff8dc]" : "hover:bg-zinc-50"}`}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(s)} className="min-w-0 flex-1 px-3 py-2 text-left text-sm"><b>{letras[s.tipo]}</b> · {s.codigo} · {s.nombre}</button>{s.tipo === "APU" && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(s, "explotado")} className="mr-2 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold hover:border-[#E6B012]">Explotar</button>}</div>)}</div>}</div><div /><div className="px-2 py-3 text-right text-zinc-400">1</div><div className="px-2 py-3 font-mono text-xs text-zinc-400">—</div><div /><div /><div /></div>
    </div></div>
    {menu?.clase === "componente" && (() => { const c = abierto.componentes.find((x) => x.id === menu.id); return c ? <MenuCaja menu={menu}><Opcion onClick={() => { setMenu(null); requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-cantidad='${c.id}']`)?.focus()); }}>Editar</Opcion><Opcion onClick={() => duplicarComponente(c)}>Duplicar debajo</Opcion>{c.tipo === "APU" && <><Opcion onClick={() => { setExpandidos((xs) => { const n = new Set(xs); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); setMenu(null); }}>Expandir / contraer</Opcion><Opcion onClick={() => { setAbiertoId(c.recursoId); setMenu(null); }}>Abrir APU original</Opcion><Opcion onClick={() => explotar(c)}>Explotar APU</Opcion></>}<div className="my-1 border-t"/><Opcion peligro onClick={() => eliminarComponente(c.id)}>Eliminar</Opcion></MenuCaja> : null; })()}
  </div>;

  const apuMenu = menu?.clase === "apu" ? apus.find((a) => a.id === menu.id) : null;
  return <div><div className="mb-4 flex items-end justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Biblioteca del proyecto</div><h1 className="mt-1 text-2xl font-bold text-zinc-900">Análisis de Precios Unitarios</h1></div><div className="text-xs text-zinc-500">{apus.length} APU</div></div>
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white p-2"><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código o descripción..." className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#E6B012]"/><button type="button" disabled={!seleccionado} onClick={() => seleccionado && setAbiertoId(seleccionado)} className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-40">Abrir composición</button><button type="button" onClick={() => nuevoRef.current?.focus()} className="h-10 rounded-md bg-[#E6B012] px-5 text-sm font-bold">+ Nuevo APU</button></div>
    {error && <Aviso>{error}</Aviso>}
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white"><div className="grid grid-cols-[120px_minmax(280px,1fr)_80px_160px_120px_40px] border-b border-zinc-300 bg-[#f7f7f5] text-xs font-semibold uppercase text-zinc-500"><Cab>Código</Cab><Cab>Descripción</Cab><Cab>Un.</Cab><Cab>Precio unitario</Cab><Cab>Modificado</Cab><Cab /></div>
      {visibles.map((apu) => <div key={apu.id} onClick={() => setSeleccionado(apu.id)} onDoubleClick={() => setAbiertoId(apu.id)} onContextMenu={(e) => { e.preventDefault(); setSeleccionado(apu.id); setMenu({ clase: "apu", id: apu.id, x: e.clientX, y: e.clientY }); }} className={`grid grid-cols-[120px_minmax(280px,1fr)_80px_160px_120px_40px] border-b border-zinc-200 text-sm ${seleccionado === apu.id ? "bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]" : "hover:bg-[#fffdf5]"}`}><Celda extra="font-bold text-zinc-500">{apu.codigo}</Celda><Celda>{apu.descripcion}</Celda><Celda>{apu.unidad}</Celda><Celda extra="text-right font-medium">{moneda(calcularCostoApu(apu.id, apus, recursos) ?? 0)}</Celda><Celda>{apu.modificado}</Celda><button type="button" onClick={(e) => { e.stopPropagation(); setSeleccionado(apu.id); setAbiertoId(apu.id); }} className="text-zinc-400 hover:text-black">›</button></div>)}
      <div className="grid grid-cols-[120px_minmax(280px,1fr)_80px_160px_120px_40px] bg-[#fffdf5]"><div className="p-1.5"><input value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)} placeholder="APU-001" className="h-9 w-full rounded border border-zinc-300 px-2 text-sm outline-none focus:border-[#E6B012]"/></div><div className="p-1.5"><input ref={nuevoRef} value={nuevaDescripcion} onChange={(e) => setNuevaDescripcion(e.target.value)} placeholder="Nuevo análisis..." className="h-9 w-full rounded border border-zinc-300 px-2 text-sm outline-none focus:border-[#E6B012]"/></div><div className="p-1.5"><input value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") crearApu(); }} className="h-9 w-full rounded border border-zinc-300 px-2 text-sm outline-none focus:border-[#E6B012]"/></div><div className="px-3 py-3 text-right text-zinc-400">—</div><div className="px-3 py-3 text-zinc-400">—</div><button type="button" onClick={crearApu} className="m-1 rounded bg-[#E6B012] font-bold">+</button></div>
    </div>{apuMenu && <MenuCaja menu={menu!}><Opcion onClick={() => { setAbiertoId(apuMenu.id); setMenu(null); }}>Abrir composición</Opcion><Opcion onClick={() => duplicarApu(apuMenu)}>Duplicar APU</Opcion><Opcion onClick={() => { void navigator.clipboard.writeText(apuMenu.descripcion); setMenu(null); }}>Copiar nombre</Opcion><div className="my-1 border-t"/><Opcion peligro onClick={() => eliminarApu(apuMenu)}>Eliminar</Opcion></MenuCaja>}</div>;
}

function Fila({ componente:c, nivel, apus, recursos, expandidos, seleccionado, onSeleccionar, onAlternar, onCantidad, onFormula, onMenu, soloLectura=false }: { componente:ComponenteApu; nivel:number; apus:Apu[]; recursos:RecursoApu[]; expandidos:Set<number>; seleccionado:boolean; onSeleccionar:()=>void; onAlternar:(id:number)=>void; onCantidad:(n:number)=>void; onFormula:(s:string)=>void; onMenu:(e:MouseEvent)=>void; soloLectura?:boolean }) {
  const apu = c.tipo === "APU" ? apus.find((a) => a.id === c.recursoId) : undefined; const r = apu ? { codigo:apu.codigo,nombre:apu.descripcion,unidad:apu.unidad,precio:calcularCostoApu(apu.id,apus,recursos)??0 } : recursos.find((x) => x.tipo===c.tipo && x.id===c.recursoId); if(!r) return null; const cantidad=cantidadComponente(c), expandido=expandidos.has(c.id);
  return <>{<div onClick={onSeleccionar} onContextMenu={soloLectura?undefined:onMenu} className={`grid ${grilla} border-b border-zinc-200 text-sm ${seleccionado?"bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]":soloLectura?"bg-zinc-50":"hover:bg-[#fffdf5]"}`}><div className="flex items-center justify-center">{c.tipo==="APU"&&<button type="button" onClick={(e)=>{e.stopPropagation();onAlternar(c.id);}}>{expandido?"⌄":"›"}</button>}</div><div className="flex items-center justify-center border-r border-zinc-200 font-bold text-zinc-500">{letras[c.tipo]}</div><div style={{paddingLeft:12+nivel*18}} className="border-r border-zinc-200 py-3 pr-2"><b>{r.codigo}</b> · {r.nombre}</div><Celda>{r.unidad}</Celda><div className="border-r border-zinc-200 p-1.5">{soloLectura?<div className="px-2 py-2 text-right">{cantidad}</div>:<CeldaEditable dato={`cantidad-${c.id}`} valor={String(c.cantidad)} tipo="number" alineada onGuardar={(valor)=>onCantidad(Number(valor))}/>}</div><div className="border-r border-zinc-200 p-1.5">{soloLectura?<div className="px-2 py-2 font-mono text-xs">{c.formulaCantidad||"—"}</div>:<CeldaEditable valor={c.formulaCantidad} formula onGuardar={onFormula}/>}</div><Celda extra="text-right">{moneda(r.precio)}</Celda><Celda extra="text-right font-medium">{moneda(cantidad*r.precio)}</Celda><div /></div>}{expandido&&apu&&[...apu.componentes].sort((a,b)=>a.orden-b.orden).map((x)=><Fila key={`${c.id}-${x.id}`} componente={x} nivel={nivel+1} apus={apus} recursos={recursos} expandidos={expandidos} seleccionado={false} onSeleccionar={()=>{}} onAlternar={onAlternar} onCantidad={()=>{}} onFormula={()=>{}} onMenu={()=>{}} soloLectura/>)}</>;
}

function CeldaEditable({ valor, onGuardar, tipo="text", alineada=false, formula=false, dato }: { valor:string; onGuardar:(valor:string)=>void; tipo?:"text"|"number"; alineada?:boolean; formula?:boolean; dato?:string }) {
  const [borrador, setBorrador] = useState(valor); const original = useRef(valor); const cancelar = useRef(false);
  function guardar() { if (cancelar.current) { cancelar.current=false; return; } onGuardar(borrador); }
  return <input data-cantidad={dato?.replace("cantidad-", "")} value={borrador} type={tipo} onFocus={() => { original.current=valor; }} onChange={(e)=>setBorrador(e.target.value)} onBlur={guardar} onKeyDown={(e)=>{ if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();} if(e.key==="Escape"){cancelar.current=true;setBorrador(original.current);e.currentTarget.blur();} }} className={`h-8 w-full rounded border border-transparent bg-transparent px-2 outline-none focus:border-[#E6B012] focus:bg-white ${alineada?"text-right":""} ${formula?"font-mono text-xs":""}`}/>;
}
function Cab({children}:{children?:React.ReactNode}){return <div className="border-r border-zinc-300 px-2 py-3">{children}</div>}
function Celda({children,extra=""}:{children:React.ReactNode;extra?:string}){return <div className={`border-r border-zinc-200 px-3 py-3 ${extra}`}>{children}</div>}
function Aviso({children}:{children:React.ReactNode}){return <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{children}</div>}
function MenuCaja({menu,children}:{menu:Menu;children:React.ReactNode}){return <div role="menu" onClick={(e)=>e.stopPropagation()} style={{left:menu.x,top:menu.y}} className="fixed z-[100] w-52 rounded-lg border border-zinc-300 bg-white py-1 shadow-xl">{children}</div>}
function Opcion({children,onClick,peligro=false}:{children:React.ReactNode;onClick:()=>void;peligro?:boolean}){return <button type="button" role="menuitem" onClick={onClick} className={`block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 ${peligro?"text-red-600":"text-zinc-700"}`}>{children}</button>}
