"use client";

import { type KeyboardEvent, type MouseEvent, useMemo, useRef, useState } from "react";

import {
  type Apu,
  type ComponenteApu,
  type RecursoApu,
  calcularCostoApu,
  cantidadComponente,
  creariaCiclo,
  explotarApu,
} from "./apu";

type Props = {
  apus: Apu[];
  setApus: React.Dispatch<React.SetStateAction<Apu[]>>;
  recursos: RecursoApu[];
};

type Sugerencia =
  | { tipo: "APU"; id: number; codigo: string; nombre: string; unidad: string; precio: number }
  | RecursoApu;

type Menu = { componenteId: number; x: number; y: number };

const letras = { APU: "A", INS: "I", MDO: "M", ALQ: "E", SUB: "S", CON: "C" } as const;

function hoy() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function moneda(valor: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(valor);
}

function nuevoId(ids: number[]) {
  return Math.max(Date.now(), ...ids.map((id) => id + 1));
}

export default function VistaApu({ apus, setApus, recursos }: Props) {
  const [apuSeleccionadoId, setApuSeleccionadoId] = useState<number | null>(apus[0]?.id ?? null);
  const [busquedaApu, setBusquedaApu] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("u");
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [descripcionBorrador, setDescripcionBorrador] = useState("");
  const [consulta, setConsulta] = useState("");
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [sugerenciaElegida, setSugerenciaElegida] = useState<Sugerencia | null>(null);
  const [modoApu, setModoApu] = useState<"encapsulado" | "explotado">("encapsulado");
  const [cantidadNueva, setCantidadNueva] = useState("1");
  const [formulaNueva, setFormulaNueva] = useState("=1");
  const [expandidos, setExpandidos] = useState(new Set<number>());
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const consultaRef = useRef<HTMLInputElement>(null);

  const apuSeleccionado = apus.find((apu) => apu.id === apuSeleccionadoId) ?? null;
  const apusVisibles = useMemo(() => {
    const texto = normalizar(busquedaApu);
    return [...apus]
      .filter((apu) => !texto || normalizar(`${apu.codigo} ${apu.descripcion}`).includes(texto))
      .sort((a, b) => a.orden - b.orden);
  }, [apus, busquedaApu]);

  const sugerencias = useMemo<Sugerencia[]>(() => {
    const texto = normalizar(consulta);
    if (!texto) return [];
    const basicos: Sugerencia[] = recursos.map((recurso) => recurso);
    const otros: Sugerencia[] = apus
      .filter((apu) => apu.id !== apuSeleccionadoId)
      .map((apu) => ({
        tipo: "APU",
        id: apu.id,
        codigo: apu.codigo,
        nombre: apu.descripcion,
        unidad: apu.unidad,
        precio: calcularCostoApu(apu.id, apus, recursos) ?? 0,
      }));
    return [...basicos, ...otros].filter((recurso) =>
      normalizar(`${recurso.codigo} ${recurso.nombre}`).includes(texto)
    ).slice(0, 12);
  }, [apus, apuSeleccionadoId, consulta, recursos]);

  function actualizarApu(id: number, cambio: (apu: Apu) => Apu) {
    setApus((actuales) => actuales.map((apu) => apu.id === id ? { ...cambio(apu), modificado: hoy() } : apu));
  }

  function crearApu() {
    const codigo = nuevoCodigo.trim();
    const descripcion = nuevaDescripcion.trim();
    const unidad = nuevaUnidad.trim();
    if (!codigo || !descripcion || !unidad) return setError("Completá código, descripción y unidad.");
    if (apus.some((apu) => normalizar(apu.codigo) === normalizar(codigo))) return setError("El código de APU ya existe.");
    const nuevo: Apu = {
      id: nuevoId(apus.map((apu) => apu.id)),
      codigo,
      descripcion,
      unidad,
      componentes: [],
      modificado: hoy(),
      orden: apus.length,
    };
    setApus((actuales) => [...actuales, nuevo]);
    setApuSeleccionadoId(nuevo.id);
    setNuevoCodigo(""); setNuevaDescripcion(""); setNuevaUnidad("u"); setError("");
  }

  function agregarComponente() {
    if (!apuSeleccionado || !sugerenciaElegida) return setError("Seleccioná un recurso.");
    const cantidad = Number(cantidadNueva.replace(",", "."));
    if (!Number.isFinite(cantidad) || cantidad < 0) return setError("Ingresá una cantidad válida.");
    if (formulaNueva.trim() && !formulaNueva.trim().startsWith("=")) return setError("La fórmula debe comenzar con =.");

    if (sugerenciaElegida.tipo === "APU" && creariaCiclo(apuSeleccionado.id, sugerenciaElegida.id, apus)) {
      return setError(`${sugerenciaElegida.codigo} generaría una referencia circular con ${apuSeleccionado.codigo}.`);
    }

    if (sugerenciaElegida.tipo === "APU" && modoApu === "explotado") {
      let secuencia = nuevoId(apuSeleccionado.componentes.map((actual) => actual.id));
      const copiados = explotarApu(sugerenciaElegida.id, apus, cantidad, () => secuencia++);
      actualizarApu(apuSeleccionado.id, (apu) => ({
        ...apu,
        componentes: [
          ...apu.componentes,
          ...copiados.map((componente, indice) => ({ ...componente, orden: apu.componentes.length + indice })),
        ],
      }));
    } else {
      const componente: ComponenteApu = {
        id: nuevoId(apuSeleccionado.componentes.map((actual) => actual.id)),
        tipo: sugerenciaElegida.tipo,
        recursoId: sugerenciaElegida.id,
        cantidad,
        formulaCantidad: formulaNueva.trim(),
        factor: 1,
        orden: apuSeleccionado.componentes.length,
        ...(sugerenciaElegida.tipo === "APU" ? { modo: "encapsulado" as const } : {}),
      };
      actualizarApu(apuSeleccionado.id, (apu) => ({ ...apu, componentes: [...apu.componentes, componente] }));
    }
    setConsulta(""); setSugerenciaElegida(null); setCantidadNueva("1"); setFormulaNueva("=1"); setError("");
    requestAnimationFrame(() => consultaRef.current?.focus());
  }

  function actualizarComponente(id: number, cambios: Partial<ComponenteApu>) {
    if (!apuSeleccionado) return;
    actualizarApu(apuSeleccionado.id, (apu) => ({
      ...apu,
      componentes: apu.componentes.map((componente) => componente.id === id ? { ...componente, ...cambios } : componente),
    }));
  }

  function eliminarComponente(id: number) {
    if (!apuSeleccionado) return;
    actualizarApu(apuSeleccionado.id, (apu) => ({ ...apu, componentes: apu.componentes.filter((componente) => componente.id !== id) }));
    setMenu(null);
  }

  function duplicarComponente(componente: ComponenteApu) {
    if (!apuSeleccionado) return;
    const copia = { ...componente, id: nuevoId(apuSeleccionado.componentes.map((actual) => actual.id)) };
    actualizarApu(apuSeleccionado.id, (apu) => {
      const indice = apu.componentes.findIndex((actual) => actual.id === componente.id);
      const componentes = [...apu.componentes];
      componentes.splice(indice + 1, 0, copia);
      return { ...apu, componentes: componentes.map((actual, orden) => ({ ...actual, orden })) };
    });
    setMenu(null);
  }

  function mover(componente: ComponenteApu, direccion: -1 | 1) {
    if (!apuSeleccionado) return;
    actualizarApu(apuSeleccionado.id, (apu) => {
      const componentes = [...apu.componentes].sort((a, b) => a.orden - b.orden);
      const indice = componentes.findIndex((actual) => actual.id === componente.id);
      const destino = indice + direccion;
      if (destino < 0 || destino >= componentes.length) return apu;
      [componentes[indice], componentes[destino]] = [componentes[destino], componentes[indice]];
      return { ...apu, componentes: componentes.map((actual, orden) => ({ ...actual, orden })) };
    });
  }

  function explotarExistente(componente: ComponenteApu) {
    if (!apuSeleccionado || componente.tipo !== "APU") return;
    let secuencia = nuevoId(apuSeleccionado.componentes.map((actual) => actual.id));
    const copiados = explotarApu(componente.recursoId, apus, cantidadComponente(componente), () => secuencia++);
    actualizarApu(apuSeleccionado.id, (apu) => {
      const indice = apu.componentes.findIndex((actual) => actual.id === componente.id);
      const componentes = [...apu.componentes];
      componentes.splice(indice, 1, ...copiados);
      return { ...apu, componentes: componentes.map((actual, orden) => ({ ...actual, orden })) };
    });
    setMenu(null);
  }

  function tecladoBusqueda(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setIndiceSugerencia((actual) => Math.min(actual + 1, sugerencias.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setIndiceSugerencia((actual) => Math.max(actual - 1, 0)); }
    if (event.key === "Enter" && sugerencias[indiceSugerencia]) { event.preventDefault(); setSugerenciaElegida(sugerencias[indiceSugerencia]); setConsulta(`${sugerencias[indiceSugerencia].codigo} · ${sugerencias[indiceSugerencia].nombre}`); }
    if (event.key === "Escape") { setConsulta(""); setSugerenciaElegida(null); }
  }

  const componenteMenu = menu && apuSeleccionado ? apuSeleccionado.componentes.find((componente) => componente.id === menu.componenteId) : undefined;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Biblioteca independiente</div><h1 className="mt-1 text-2xl font-bold text-zinc-900">Análisis de Precios Unitarios</h1></div><div className="text-xs text-zinc-500">{apus.length} APU</div></div>
      {error && <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</div>}
      <div className="grid min-h-[620px] grid-cols-[330px_minmax(760px,1fr)] overflow-hidden rounded-lg border border-zinc-300 bg-white">
        <aside className="border-r border-zinc-300 bg-[#fafafa]">
          <div className="border-b border-zinc-200 p-3"><input value={busquedaApu} onChange={(event) => setBusquedaApu(event.target.value)} placeholder="Buscar APU..." className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#E6B012]" /></div>
          <div className="max-h-[500px] overflow-auto">{apusVisibles.map((apu) => <button type="button" key={apu.id} onClick={() => setApuSeleccionadoId(apu.id)} className={`block w-full border-b border-zinc-200 px-4 py-3 text-left ${apu.id === apuSeleccionadoId ? "bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]" : "hover:bg-white"}`}><div className="text-xs font-bold text-zinc-400">{apu.codigo}</div><div className="mt-1 text-sm font-medium text-zinc-800">{apu.descripcion}</div><div className="mt-1 text-xs text-zinc-500">{moneda(calcularCostoApu(apu.id, apus, recursos) ?? 0)} / {apu.unidad}</div></button>)}</div>
          <div className="border-t border-zinc-300 bg-[#fffdf5] p-3"><div className="grid grid-cols-[90px_1fr_55px] gap-2"><input value={nuevoCodigo} onChange={(event) => setNuevoCodigo(event.target.value)} placeholder="APU-001" className="rounded border border-zinc-300 px-2 py-2 text-xs outline-none" /><input value={nuevaDescripcion} onChange={(event) => setNuevaDescripcion(event.target.value)} placeholder="Nuevo APU..." className="rounded border border-zinc-300 px-2 py-2 text-sm outline-none" /><input value={nuevaUnidad} onChange={(event) => setNuevaUnidad(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") crearApu(); }} className="rounded border border-zinc-300 px-2 py-2 text-sm outline-none" /></div></div>
        </aside>

        <section className="min-w-0">
          {!apuSeleccionado ? <div className="flex h-full items-center justify-center text-sm text-zinc-400">Creá o seleccioná un APU.</div> : <>
            <div className="flex items-center justify-between border-b border-zinc-300 px-5 py-4"><div>{editandoDescripcion ? <input autoFocus value={descripcionBorrador} onChange={(event) => setDescripcionBorrador(event.target.value)} onBlur={() => { if (descripcionBorrador.trim()) actualizarApu(apuSeleccionado.id, (apu) => ({ ...apu, descripcion: descripcionBorrador.trim() })); setEditandoDescripcion(false); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setEditandoDescripcion(false); }} className="rounded border border-[#E6B012] px-2 py-1 text-lg font-bold outline-none" /> : <button type="button" onDoubleClick={() => { setDescripcionBorrador(apuSeleccionado.descripcion); setEditandoDescripcion(true); }} className="text-left"><div className="text-xs font-bold text-zinc-400">{apuSeleccionado.codigo}</div><h2 className="text-lg font-bold">{apuSeleccionado.descripcion}</h2></button>}</div><div className="text-right"><div className="text-xs uppercase text-zinc-400">Costo unitario</div><div className="text-xl font-bold">{moneda(calcularCostoApu(apuSeleccionado.id, apus, recursos) ?? 0)}</div></div></div>
            <div className="overflow-x-auto">
              <div className="min-w-[980px]"><div className="grid grid-cols-[34px_42px_minmax(260px,1fr)_70px_95px_150px_120px_130px_64px] border-b border-zinc-300 bg-[#f7f7f5] text-xs font-semibold uppercase text-zinc-500"><Cab /><Cab>Tipo</Cab><Cab>Recurso</Cab><Cab>Un.</Cab><Cab>Cant.</Cab><Cab>Fórmula</Cab><Cab>P. unitario</Cab><Cab>Subtotal</Cab><Cab /></div>
                {[...apuSeleccionado.componentes].sort((a, b) => a.orden - b.orden).map((componente) => <FilaComponente key={componente.id} componente={componente} nivel={0} apus={apus} recursos={recursos} expandidos={expandidos} seleccionado={seleccionado === componente.id} onSeleccionar={() => setSeleccionado(componente.id)} onAlternar={(id) => setExpandidos((actuales) => { const siguientes = new Set(actuales); if (siguientes.has(id)) siguientes.delete(id); else siguientes.add(id); return siguientes; })} onCantidad={(cantidad) => actualizarComponente(componente.id, { cantidad })} onFormula={(formulaCantidad) => actualizarComponente(componente.id, { formulaCantidad })} onMenu={(event) => { event.preventDefault(); setSeleccionado(componente.id); setMenu({ componenteId: componente.id, x: event.clientX, y: event.clientY }); }} />)}
                <div className="grid grid-cols-[34px_42px_minmax(260px,1fr)_70px_95px_150px_120px_130px_64px] bg-[#fffdf5]"><div /><div className="flex items-center justify-center text-zinc-300">+</div><div className="relative p-1.5"><input ref={consultaRef} value={consulta} onChange={(event) => { setConsulta(event.target.value); setSugerenciaElegida(null); setIndiceSugerencia(0); }} onKeyDown={tecladoBusqueda} placeholder="Agregar recurso o APU..." className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" />{sugerencias.length > 0 && !sugerenciaElegida && <div className="absolute left-1 top-full z-30 max-h-56 w-[430px] overflow-auto rounded border border-zinc-300 bg-white py-1 shadow-lg">{sugerencias.map((sugerencia, indice) => <button type="button" key={`${sugerencia.tipo}-${sugerencia.id}`} onClick={() => { setSugerenciaElegida(sugerencia); setConsulta(`${sugerencia.codigo} · ${sugerencia.nombre}`); }} className={`block w-full px-3 py-2 text-left text-sm ${indice === indiceSugerencia ? "bg-[#fff8dc]" : "hover:bg-zinc-50"}`}><b>{letras[sugerencia.tipo]}</b> · {sugerencia.codigo} · {sugerencia.nombre}</button>)}</div>}</div><div className="p-1.5">{sugerenciaElegida?.tipo === "APU" && <select value={modoApu} onChange={(event) => setModoApu(event.target.value as typeof modoApu)} className="h-9 w-full rounded border border-zinc-300 text-xs"><option value="encapsulado">Encap.</option><option value="explotado">Explot.</option></select>}</div><div className="p-1.5"><input value={cantidadNueva} onChange={(event) => setCantidadNueva(event.target.value)} className="h-9 w-full rounded border border-zinc-300 px-2 text-right text-sm" /></div><div className="p-1.5"><input value={formulaNueva} onChange={(event) => setFormulaNueva(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") agregarComponente(); }} className="h-9 w-full rounded border border-zinc-300 px-2 font-mono text-xs" /></div><div className="px-3 py-3 text-right text-sm">{sugerenciaElegida ? moneda(sugerenciaElegida.precio) : "—"}</div><div /><button type="button" onClick={agregarComponente} className="m-1 rounded bg-[#E6B012] text-xs font-bold">Agregar</button></div>
              </div>
            </div>
          </>}
        </section>
      </div>

      {menu && componenteMenu && <div role="menu" onClick={(event) => event.stopPropagation()} style={{ left: menu.x, top: menu.y }} className="fixed z-[100] w-52 rounded-lg border border-zinc-300 bg-white py-1 shadow-xl"><Opcion onClick={() => setMenu(null)}>Editar</Opcion><Opcion onClick={() => duplicarComponente(componenteMenu)}>Duplicar debajo</Opcion><Opcion onClick={() => { void navigator.clipboard.writeText(JSON.stringify(componenteMenu)); setMenu(null); }}>Copiar</Opcion>{componenteMenu.tipo === "APU" && <><Opcion onClick={() => { setExpandidos((actuales) => new Set(actuales).add(componenteMenu.id)); setMenu(null); }}>Expandir / Contraer</Opcion><Opcion onClick={() => { setApuSeleccionadoId(componenteMenu.recursoId); setMenu(null); }}>Abrir APU original</Opcion><Opcion onClick={() => explotarExistente(componenteMenu)}>Explotar APU</Opcion></>}<Opcion onClick={() => mover(componenteMenu, -1)}>Mover arriba</Opcion><Opcion onClick={() => mover(componenteMenu, 1)}>Mover abajo</Opcion><div className="my-1 border-t" /><Opcion peligro onClick={() => eliminarComponente(componenteMenu.id)}>Eliminar</Opcion></div>}
    </div>
  );
}

function FilaComponente({ componente, nivel, apus, recursos, expandidos, seleccionado, onSeleccionar, onAlternar, onCantidad, onFormula, onMenu, soloLectura = false }: { componente: ComponenteApu; nivel: number; apus: Apu[]; recursos: RecursoApu[]; expandidos: Set<number>; seleccionado: boolean; onSeleccionar: () => void; onAlternar: (id: number) => void; onCantidad: (cantidad: number) => void; onFormula: (formula: string) => void; onMenu: (event: MouseEvent) => void; soloLectura?: boolean }) {
  const apu = componente.tipo === "APU" ? apus.find((actual) => actual.id === componente.recursoId) : undefined;
  const recurso = apu ? { codigo: apu.codigo, nombre: apu.descripcion, unidad: apu.unidad, precio: calcularCostoApu(apu.id, apus, recursos) ?? 0 } : recursos.find((actual) => actual.tipo === componente.tipo && actual.id === componente.recursoId);
  if (!recurso) return null;
  const cantidad = cantidadComponente(componente);
  const expandido = expandidos.has(componente.id);
  return <><div onClick={onSeleccionar} onContextMenu={soloLectura ? undefined : onMenu} className={`grid grid-cols-[34px_42px_minmax(260px,1fr)_70px_95px_150px_120px_130px_64px] border-b border-zinc-200 text-sm ${seleccionado ? "bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]" : soloLectura ? "bg-zinc-50" : "hover:bg-[#fffdf5]"}`}><div className="flex items-center justify-center">{componente.tipo === "APU" && <button type="button" onClick={(event) => { event.stopPropagation(); onAlternar(componente.id); }} className="text-zinc-500">{expandido ? "⌄" : "›"}</button>}</div><div className="flex items-center justify-center border-r border-zinc-200 font-bold text-zinc-500">{letras[componente.tipo]}</div><div style={{ paddingLeft: `${12 + nivel * 18}px` }} className="border-r border-zinc-200 py-3 pr-3"><b>{recurso.codigo}</b> · {recurso.nombre}</div><div className="border-r border-zinc-200 px-2 py-3">{recurso.unidad}</div><div className="border-r border-zinc-200 p-1.5">{soloLectura ? <div className="px-2 py-2 text-right">{cantidad}</div> : <input value={componente.cantidad} type="number" onChange={(event) => onCantidad(Number(event.target.value))} className="h-8 w-full rounded border border-transparent px-2 text-right outline-none focus:border-[#E6B012]" />}</div><div className="border-r border-zinc-200 p-1.5">{soloLectura ? <div className="px-2 py-2 font-mono text-xs">{componente.formulaCantidad}</div> : <input value={componente.formulaCantidad} onChange={(event) => onFormula(event.target.value)} className="h-8 w-full rounded border border-transparent px-2 font-mono text-xs outline-none focus:border-[#E6B012]" />}</div><div className="border-r border-zinc-200 px-3 py-3 text-right">{moneda(recurso.precio)}</div><div className="border-r border-zinc-200 px-3 py-3 text-right font-medium">{moneda(cantidad * recurso.precio)}</div><div /></div>{expandido && apu && [...apu.componentes].sort((a, b) => a.orden - b.orden).map((interno) => <FilaComponente key={`${componente.id}-${interno.id}`} componente={interno} nivel={nivel + 1} apus={apus} recursos={recursos} expandidos={expandidos} seleccionado={false} onSeleccionar={() => {}} onAlternar={onAlternar} onCantidad={() => {}} onFormula={() => {}} onMenu={() => {}} soloLectura />)}</>;
}

function Cab({ children }: { children?: React.ReactNode }) { return <div className="border-r border-zinc-300 px-2 py-3">{children}</div>; }
function Opcion({ children, onClick, peligro = false }: { children: React.ReactNode; onClick: () => void; peligro?: boolean }) { return <button type="button" role="menuitem" onClick={onClick} className={`block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 ${peligro ? "text-red-600" : "text-zinc-700"}`}>{children}</button>; }
