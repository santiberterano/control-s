"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CategoriaInsumo = {
  id: number;
  nombre: string;
  prefijo: string;
  ultimoCorrelativo: number;
  creado: string;
  modificado: string;
};

export type Insumo = {
  id: number;
  categoriaId: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  comentario: string;
  creado: string;
  modificado: string;
};

export function categoriasIniciales(): CategoriaInsumo[] {
  const fecha = "11/10/2026";
  return [
    [1, "Hormigón armado", "HAO"],
    [2, "Revoques", "REV"],
    [3, "Mampostería", "MAM"],
    [4, "Pinturas", "PIN"],
    [5, "Electricidad", "ELE"],
    [6, "Sanitarias", "SAN"],
    [7, "Aislaciones", "AIS"],
  ].map(([id, nombre, prefijo]) => ({
    id: id as number,
    nombre: nombre as string,
    prefijo: prefijo as string,
    ultimoCorrelativo: 0,
    creado: fecha,
    modificado: fecha,
  }));
}

type Props = {
  categorias: CategoriaInsumo[];
  setCategorias: React.Dispatch<React.SetStateAction<CategoriaInsumo[]>>;
  insumos: Insumo[];
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
};

type Menu = { id: number; x: number; y: number };

function hoy() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function idNuevo(ids: number[]) {
  return Math.max(Date.now(), ...ids.map((id) => id + 1));
}

function sugerirPrefijo(nombre: string) {
  const letras = normalizar(nombre).replace(/[^A-Z]/g, "");
  return letras.slice(0, 3);
}

export default function VistaInsumos({ categorias, setCategorias, insumos, setInsumos }: Props) {
  const [categoriaActiva, setCategoriaActiva] = useState<number | "todos">("todos");
  const [ultimaCategoria, setUltimaCategoria] = useState<number | null>(categorias[0]?.id ?? null);
  const [busqueda, setBusqueda] = useState("");
  const [panelCategorias, setPanelCategorias] = useState(false);
  const [modoPanel, setModoPanel] = useState<"crear" | "administrar">("crear");
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [prefijoCategoria, setPrefijoCategoria] = useState("");
  const [prefijoManual, setPrefijoManual] = useState(false);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState<number | null>(null);
  const [nombreBorrador, setNombreBorrador] = useState("");
  const [comentarioAbierto, setComentarioAbierto] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoriaId, setNuevaCategoriaId] = useState<number | null>(null);
  const [nuevaUnidad, setNuevaUnidad] = useState("u");
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const nuevoNombreRef = useRef<HTMLInputElement>(null);
  const nuevaUnidadRef = useRef<HTMLInputElement>(null);
  const nuevoPrecioRef = useRef<HTMLInputElement>(null);
  const nombresRef = useRef(new Map<number, HTMLInputElement>());
  const cancelandoNombre = useRef(false);

  useEffect(() => {
    const fecha = hoy();
    let categoriasCambiaron = false;
    const categoriasMigradas = categorias.map((categoria) => {
      if (
        categoria.ultimoCorrelativo !== undefined &&
        categoria.creado &&
        categoria.modificado
      ) return categoria;
      categoriasCambiaron = true;
      const maximo = insumos
        .filter((insumo) => insumo.categoriaId === categoria.id)
        .reduce((mayor, insumo) => Math.max(mayor, Number(insumo.codigo.split("-").at(-1)) || 0), 0);
      return {
        ...categoria,
        ultimoCorrelativo: categoria.ultimoCorrelativo ?? maximo,
        creado: categoria.creado || fecha,
        modificado: categoria.modificado || fecha,
      };
    });
    if (categoriasCambiaron) setCategorias(categoriasMigradas);

    let insumosCambiaron = false;
    const insumosMigrados = insumos.map((insumo) => {
      if (insumo.comentario !== undefined && insumo.creado && insumo.modificado) return insumo;
      insumosCambiaron = true;
      return {
        ...insumo,
        comentario: insumo.comentario ?? "",
        creado: insumo.creado || fecha,
        modificado: insumo.modificado || insumo.creado || fecha,
      };
    });
    if (insumosCambiaron) setInsumos(insumosMigrados);
  }, [categorias, insumos, setCategorias, setInsumos]);

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [categorias]
  );

  useEffect(() => {
    if (editandoNombre === null) return;
    requestAnimationFrame(() => {
      const input = nombresRef.current.get(editandoNombre);
      input?.focus();
      input?.select();
    });
  }, [editandoNombre]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    window.addEventListener("click", cerrar);
    return () => window.removeEventListener("click", cerrar);
  }, [menu]);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    return insumos.filter((insumo) => {
      if (categoriaActiva !== "todos" && insumo.categoriaId !== categoriaActiva) return false;
      return !texto || normalizar(`${insumo.codigo} ${insumo.nombre}`).includes(texto);
    });
  }, [busqueda, categoriaActiva, insumos]);

  function seleccionarCategoria(id: number | "todos") {
    setCategoriaActiva(id);
    if (id !== "todos") {
      setNuevaCategoriaId(id);
      setUltimaCategoria(id);
    } else if (nuevaCategoriaId === null) {
      setNuevaCategoriaId(ultimaCategoria ?? categoriasOrdenadas[0]?.id ?? null);
    }
  }

  function validarCategoria(nombre: string, prefijo: string, ignorarId?: number) {
    if (!nombre.trim()) return "Ingresá un nombre de categoría.";
    if (categorias.some((categoria) => categoria.id !== ignorarId && normalizar(categoria.nombre) === normalizar(nombre))) {
      return "Ya existe una categoría con ese nombre.";
    }
    if (!/^[A-Z]{3}$/.test(prefijo)) return "El prefijo debe contener exactamente tres letras A-Z.";
    if (categorias.some((categoria) => categoria.id !== ignorarId && categoria.prefijo === prefijo)) {
      return "Ese prefijo ya está en uso.";
    }
    return "";
  }

  function crearCategoria() {
    const nombre = nombreCategoria.trim();
    const prefijo = prefijoCategoria.toUpperCase();
    const mensaje = validarCategoria(nombre, prefijo);
    if (mensaje) return setError(mensaje);
    const fecha = hoy();
    const nueva: CategoriaInsumo = {
      id: idNuevo(categorias.map((categoria) => categoria.id)),
      nombre,
      prefijo,
      ultimoCorrelativo: 0,
      creado: fecha,
      modificado: fecha,
    };
    setCategorias((actuales) => [...actuales, nueva]);
    setCategoriaActiva(nueva.id);
    setUltimaCategoria(nueva.id);
    setNuevaCategoriaId(nueva.id);
    setNombreCategoria("");
    setPrefijoCategoria("");
    setPrefijoManual(false);
    setError("");
  }

  function editarCategoria(id: number, campo: "nombre" | "prefijo", valor: string) {
    const categoria = categorias.find((actual) => actual.id === id);
    if (!categoria) return;
    const nombre = campo === "nombre" ? valor.trim() : categoria.nombre;
    const prefijo = campo === "prefijo" ? valor.toUpperCase() : categoria.prefijo;
    const mensaje = validarCategoria(nombre, prefijo, id);
    if (mensaje) return setError(mensaje);
    setCategorias((actuales) => actuales.map((actual) =>
      actual.id === id ? { ...actual, [campo]: campo === "prefijo" ? prefijo : nombre, modificado: hoy() } : actual
    ));
    if (campo === "prefijo" && insumos.some((insumo) => insumo.categoriaId === id)) {
      setError("Prefijo actualizado. Los códigos existentes conservaron su valor original.");
    } else setError("");
  }

  function eliminarCategoria(categoria: CategoriaInsumo) {
    const cantidad = insumos.filter((insumo) => insumo.categoriaId === categoria.id).length;
    if (cantidad) return setError(`No se puede eliminar: hay ${cantidad} insumo${cantidad === 1 ? "" : "s"} asociado${cantidad === 1 ? "" : "s"}.`);
    if (!window.confirm(`¿Eliminar la categoría ${categoria.nombre}?`)) return;
    setCategorias((actuales) => actuales.filter((actual) => actual.id !== categoria.id));
    if (categoriaActiva === categoria.id) setCategoriaActiva("todos");
  }

  function proximoCodigo(categoria: CategoriaInsumo) {
    let correlativo = categoria.ultimoCorrelativo + 1;
    let codigo = `${categoria.prefijo}-${String(correlativo).padStart(3, "0")}`;
    while (insumos.some((insumo) => insumo.codigo === codigo)) {
      correlativo += 1;
      codigo = `${categoria.prefijo}-${String(correlativo).padStart(3, "0")}`;
    }
    return { correlativo, codigo };
  }

  function crearInsumo() {
    const categoria = categorias.find((actual) => actual.id === nuevaCategoriaId);
    const nombre = nuevoNombre.trim();
    const unidad = nuevaUnidad.trim();
    const precio = Number(nuevoPrecio.replace(",", "."));
    if (!categoria) return setError("Seleccioná una categoría existente.");
    if (!nombre) return setError("Ingresá el nombre del insumo.");
    if (!unidad) return setError("Ingresá una unidad.");
    if (!Number.isFinite(precio) || precio < 0) return setError("Ingresá un precio válido.");
    const { correlativo, codigo } = proximoCodigo(categoria);
    const fecha = hoy();
    const nuevo: Insumo = {
      id: idNuevo(insumos.map((insumo) => insumo.id)),
      categoriaId: categoria.id,
      codigo,
      nombre,
      unidad,
      precio,
      comentario: "",
      creado: fecha,
      modificado: fecha,
    };
    setInsumos((actuales) => [...actuales, nuevo]);
    setCategorias((actuales) => actuales.map((actual) =>
      actual.id === categoria.id ? { ...actual, ultimoCorrelativo: correlativo, modificado: fecha } : actual
    ));
    setUltimaCategoria(categoria.id);
    setNuevoNombre("");
    setNuevaUnidad("u");
    setNuevoPrecio("");
    setError("");
    requestAnimationFrame(() => nuevoNombreRef.current?.focus());
  }

  function actualizarInsumo(id: number, cambios: Partial<Insumo>) {
    setInsumos((actuales) => actuales.map((actual) =>
      actual.id === id ? { ...actual, ...cambios, modificado: hoy() } : actual
    ));
  }

  function confirmarNombre(insumo: Insumo) {
    const nombre = nombreBorrador.trim();
    if (!nombre) return setError("El nombre no puede estar vacío.");
    actualizarInsumo(insumo.id, { nombre });
    setEditandoNombre(null);
    setError("");
  }

  function duplicar(insumo: Insumo) {
    const categoria = categorias.find((actual) => actual.id === insumo.categoriaId);
    if (!categoria) return setError("La categoría del insumo ya no existe.");
    const { correlativo, codigo } = proximoCodigo(categoria);
    const fecha = hoy();
    const copia: Insumo = { ...insumo, id: idNuevo(insumos.map((actual) => actual.id)), codigo, creado: fecha, modificado: fecha };
    setInsumos((actuales) => {
      const indice = actuales.findIndex((actual) => actual.id === insumo.id);
      const siguientes = [...actuales];
      siguientes.splice(indice + 1, 0, copia);
      return siguientes;
    });
    setCategorias((actuales) => actuales.map((actual) =>
      actual.id === categoria.id ? { ...actual, ultimoCorrelativo: correlativo, modificado: fecha } : actual
    ));
    setSeleccionado(copia.id);
    setNombreBorrador(copia.nombre);
    setEditandoNombre(copia.id);
    setMenu(null);
  }

  function eliminar(insumo: Insumo) {
    setMenu(null);
    if (!window.confirm(`¿Eliminar ${insumo.codigo} · ${insumo.nombre}?`)) return;
    setInsumos((actuales) => actuales.filter((actual) => actual.id !== insumo.id));
    if (seleccionado === insumo.id) setSeleccionado(null);
  }

  function abrirMenu(event: MouseEvent, id: number) {
    event.preventDefault();
    setSeleccionado(id);
    setMenu({ id, x: event.clientX, y: event.clientY });
  }

  const insumoMenu = menu ? insumos.find((insumo) => insumo.id === menu.id) : undefined;
  const todas = categoriaActiva === "todos";
  const columnas = todas
    ? "grid-cols-[115px_minmax(230px,1fr)_190px_85px_130px_110px_46px]"
    : "grid-cols-[115px_minmax(260px,1fr)_85px_140px_110px_46px]";

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Biblioteca del proyecto</div>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Insumos</h1>
        </div>
        <div className="text-xs text-zinc-500">Materiales · Base CONSCA 2026</div>
      </div>

      <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white p-2">
        <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por código o descripción..." className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#E6B012]" />
        <button type="button" onClick={() => { setPanelCategorias((abierto) => !abierto); setError(""); }} className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold hover:bg-zinc-50">+ Categoría</button>
        <button type="button" onClick={() => nuevoNombreRef.current?.focus()} className="h-10 rounded-md bg-[#E6B012] px-5 text-sm font-bold text-black hover:brightness-95">+ Nuevo insumo</button>
      </div>

      {panelCategorias && (
        <div className="mb-3 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button type="button" onClick={() => setModoPanel("crear")} className={`rounded px-3 py-2 text-sm ${modoPanel === "crear" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Crear categoría</button>
            <button type="button" onClick={() => setModoPanel("administrar")} className={`rounded px-3 py-2 text-sm ${modoPanel === "administrar" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Administrar</button>
          </div>
          {modoPanel === "crear" ? (
            <div className="grid grid-cols-[1fr_130px_auto] gap-2">
              <input value={nombreCategoria} onChange={(event) => { const valor = event.target.value; setNombreCategoria(valor); if (!prefijoManual) setPrefijoCategoria(sugerirPrefijo(valor)); }} placeholder="Nombre de categoría" className="rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#E6B012]" />
              <input value={prefijoCategoria} maxLength={3} onChange={(event) => { setPrefijoManual(true); setPrefijoCategoria(event.target.value.toUpperCase().replace(/[^A-Z]/g, "")); }} placeholder="ABC" className="rounded border border-zinc-300 px-3 py-2 text-sm font-bold uppercase outline-none focus:border-[#E6B012]" />
              <button type="button" onClick={crearCategoria} className="rounded bg-[#E6B012] px-5 py-2 text-sm font-bold">Crear</button>
            </div>
          ) : (
            <div className="space-y-2">
              {categoriasOrdenadas.map((categoria) => {
                const cantidad = insumos.filter((insumo) => insumo.categoriaId === categoria.id).length;
                return (
                  <div key={categoria.id} className="grid grid-cols-[1fr_100px_130px_38px] items-center gap-2">
                    <input defaultValue={categoria.nombre} onBlur={(event) => editarCategoria(categoria.id, "nombre", event.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#E6B012]" />
                    <input defaultValue={categoria.prefijo} maxLength={3} onBlur={(event) => editarCategoria(categoria.id, "prefijo", event.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm font-bold uppercase outline-none focus:border-[#E6B012]" />
                    <span className="text-xs text-zinc-500">{cantidad} insumo{cantidad === 1 ? "" : "s"}</span>
                    <button type="button" onClick={() => eliminarCategoria(categoria)} className="h-9 rounded text-zinc-400 hover:bg-red-50 hover:text-red-600">×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</div>}

      <div className="mb-0 flex overflow-x-auto rounded-t-lg border border-b-0 border-zinc-300 bg-white px-2 pt-2">
        <Tab activa={categoriaActiva === "todos"} onClick={() => seleccionarCategoria("todos")}>Todos</Tab>
        {categoriasOrdenadas.map((categoria) => <Tab key={categoria.id} activa={categoriaActiva === categoria.id} onClick={() => seleccionarCategoria(categoria.id)}>{categoria.nombre}</Tab>)}
      </div>

      <div className="overflow-hidden rounded-b-lg border border-zinc-300 bg-white">
        <div className={`grid ${columnas} border-b border-zinc-300 bg-[#f7f7f5]`}>
          <Cabecera>Código</Cabecera><Cabecera>Insumo</Cabecera>
          {todas && <Cabecera>Categoría</Cabecera>}
          <Cabecera>Unidad</Cabecera><Cabecera>Precio</Cabecera><Cabecera>Modificado</Cabecera><div />
        </div>
        {visibles.map((insumo) => {
          const estaSeleccionado = seleccionado === insumo.id;
          return (
            <div key={insumo.id}>
              <div onClick={() => setSeleccionado(insumo.id)} onContextMenu={(event) => abrirMenu(event, insumo.id)} className={`grid ${columnas} border-b border-zinc-200 transition ${estaSeleccionado ? "bg-[#fff8dc] shadow-[inset_3px_0_0_#E6B012]" : "bg-white hover:bg-[#fffdf5]"} focus-within:bg-[#fff8dc]`}>
                <Celda><span className="font-semibold">{insumo.codigo}</span></Celda>
                <div className="border-r border-zinc-200">
                  {editandoNombre === insumo.id ? (
                    <input ref={(elemento) => { if (elemento) nombresRef.current.set(insumo.id, elemento); else nombresRef.current.delete(insumo.id); }} value={nombreBorrador} onChange={(event) => setNombreBorrador(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { cancelandoNombre.current = true; setEditandoNombre(null); } if (event.key === "Enter") confirmarNombre(insumo); }} onBlur={() => { if (cancelandoNombre.current) cancelandoNombre.current = false; else confirmarNombre(insumo); }} className="h-full w-full bg-transparent px-3 py-3 text-sm outline-none" />
                  ) : <button type="button" onDoubleClick={() => { setNombreBorrador(insumo.nombre); setEditandoNombre(insumo.id); }} className="h-full w-full px-3 py-3 text-left text-sm">{insumo.nombre}</button>}
                </div>
                {todas && <div className="border-r border-zinc-200 p-1.5"><CategoriaAutocomplete categorias={categoriasOrdenadas} valorId={insumo.categoriaId} onChange={(categoriaId) => actualizarInsumo(insumo.id, { categoriaId })} /></div>}
                <div className="border-r border-zinc-200 p-1.5"><input value={insumo.unidad} onChange={(event) => actualizarInsumo(insumo.id, { unidad: event.target.value })} className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" /></div>
                <div className="border-r border-zinc-200 p-1.5"><input value={insumo.precio} type="number" min="0" onChange={(event) => actualizarInsumo(insumo.id, { precio: Number(event.target.value) })} className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-right text-sm outline-none focus:border-[#E6B012] focus:bg-white" /></div>
                <Celda>{insumo.modificado || insumo.creado || hoy()}</Celda>
                <button type="button" title="Comentarios" onClick={(event) => { event.stopPropagation(); setComentarioAbierto((actual) => actual === insumo.id ? null : insumo.id); }} className={`text-sm ${insumo.comentario ? "text-[#b88700]" : "text-zinc-300"} hover:bg-zinc-100`}>●</button>
              </div>
              {comentarioAbierto === insumo.id && <div className="border-b border-zinc-200 bg-[#fafafa] p-3"><textarea value={insumo.comentario} onChange={(event) => actualizarInsumo(insumo.id, { comentario: event.target.value })} placeholder="Comentarios del insumo..." rows={3} className="w-full resize-y rounded border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-[#E6B012]" /></div>}
            </div>
          );
        })}

        <div className={`grid ${columnas} bg-[#fffdf5]`}>
          <Celda><span className="text-zinc-400">Automático</span></Celda>
          <div className="border-r border-zinc-200 p-1.5"><input ref={nuevoNombreRef} value={nuevoNombre} onChange={(event) => setNuevoNombre(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); nuevaUnidadRef.current?.focus(); } if (event.key === "Escape") setNuevoNombre(""); }} placeholder="+ Nuevo insumo..." className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" /></div>
          {todas && <div className="border-r border-zinc-200 p-1.5"><CategoriaAutocomplete categorias={categoriasOrdenadas} valorId={nuevaCategoriaId} onChange={(id) => { setNuevaCategoriaId(id); setUltimaCategoria(id); }} /></div>}
          <div className="border-r border-zinc-200 p-1.5"><input ref={nuevaUnidadRef} value={nuevaUnidad} onChange={(event) => setNuevaUnidad(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); nuevoPrecioRef.current?.focus(); nuevoPrecioRef.current?.select(); } }} className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" /></div>
          <div className="border-r border-zinc-200 p-1.5"><input ref={nuevoPrecioRef} value={nuevoPrecio} inputMode="decimal" onChange={(event) => setNuevoPrecio(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); crearInsumo(); } if (event.key === "Escape") setNuevoPrecio(""); }} placeholder="$ 0" className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-right text-sm outline-none focus:border-[#E6B012] focus:bg-white" /></div>
          <Celda>Enter para agregar</Celda><div />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-xs text-zinc-400"><span>{visibles.length} visibles</span><span>{insumos.length} insumos en el proyecto</span></div>

      {menu && insumoMenu && <div role="menu" onClick={(event) => event.stopPropagation()} style={{ left: menu.x, top: menu.y }} className="fixed z-[100] w-52 overflow-hidden rounded-lg border border-zinc-300 bg-white py-1 shadow-xl">
        <Opcion onClick={() => { setNombreBorrador(insumoMenu.nombre); setEditandoNombre(insumoMenu.id); setMenu(null); }}>Editar nombre</Opcion>
        <Opcion onClick={() => duplicar(insumoMenu)}>Duplicar insumo</Opcion>
        <Opcion onClick={() => { void navigator.clipboard.writeText(insumoMenu.nombre); setMenu(null); }}>Copiar nombre</Opcion>
        <div className="my-1 border-t border-zinc-200" /><Opcion peligro onClick={() => eliminar(insumoMenu)}>Eliminar insumo</Opcion>
      </div>}
    </div>
  );
}

function CategoriaAutocomplete({ categorias, valorId, onChange }: { categorias: CategoriaInsumo[]; valorId: number | null; onChange: (id: number) => void }) {
  const seleccionada = categorias.find((categoria) => categoria.id === valorId);
  const [texto, setTexto] = useState(seleccionada?.nombre ?? "");
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const opciones = categorias.filter((categoria) => normalizar(categoria.nombre).includes(normalizar(texto)));
  function elegir(categoria: CategoriaInsumo) { onChange(categoria.id); setTexto(categoria.nombre); setAbierto(false); }
  function teclado(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setAbierto(true); setIndice((actual) => Math.min(actual + 1, opciones.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setIndice((actual) => Math.max(actual - 1, 0)); }
    if (event.key === "Enter" && abierto && opciones[indice]) { event.preventDefault(); elegir(opciones[indice]); }
    if (event.key === "Escape") { setAbierto(false); setTexto(seleccionada?.nombre ?? ""); }
    if (event.key === "Tab") setAbierto(false);
  }
  return <div className="relative"><input value={texto} onFocus={() => setAbierto(true)} onChange={(event) => { setTexto(event.target.value); setAbierto(true); setIndice(0); }} onKeyDown={teclado} placeholder="Categoría..." className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white" />{abierto && opciones.length > 0 && <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full min-w-56 overflow-auto rounded border border-zinc-300 bg-white py-1 shadow-lg">{opciones.map((categoria, posicion) => <button type="button" key={categoria.id} onMouseDown={(event) => event.preventDefault()} onClick={() => elegir(categoria)} className={`block w-full px-3 py-2 text-left text-sm ${posicion === indice ? "bg-[#fff8dc]" : "hover:bg-zinc-50"}`}>{categoria.nombre} <span className="text-xs font-bold text-zinc-400">— {categoria.prefijo}</span></button>)}</div>}</div>;
}

function Tab({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`shrink-0 border-b-[3px] px-4 py-2 text-sm ${activa ? "border-[#E6B012] bg-[#fffdf5] font-semibold text-zinc-900" : "border-transparent text-zinc-500 hover:bg-zinc-50"}`}>{children}</button>; }
function Cabecera({ children }: { children: React.ReactNode }) { return <div className="border-r border-zinc-300 px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{children}</div>; }
function Celda({ children }: { children: React.ReactNode }) { return <div className="border-r border-zinc-200 px-3 py-3 text-sm text-zinc-800">{children}</div>; }
function Opcion({ children, onClick, peligro = false }: { children: React.ReactNode; onClick: () => void; peligro?: boolean }) { return <button type="button" role="menuitem" onClick={onClick} className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 ${peligro ? "text-red-600" : "text-zinc-700"}`}>{children}</button>; }
