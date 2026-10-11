"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  calcularPrecioRecurso,
  type RecursoCalculable,
} from "./calculosRecursos";

export type RecursoEditable = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  formula: string;
  ultimaModificacion: string;
};

export type PrefijoRecurso = RecursoCalculable["tipo"];

type VistaRecursosProps<T extends RecursoEditable> = {
  recursos: T[];
  setRecursos: React.Dispatch<React.SetStateAction<T[]>>;
  prefijo: PrefijoRecurso;
  titulo: string;
  botonNuevo: string;
  nombreSingular: string;
  unidadInicial?: string;
  referencias: RecursoCalculable[];
  onRenombrarReferencia?: (
    tipo: PrefijoRecurso,
    codigo: string,
    nombreAnterior: string,
    nombreNuevo: string
  ) => void;
};

type MenuContextual = { id: number; x: number; y: number };

function fechaHoy() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(valor);
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function siguienteCodigo(recursos: RecursoEditable[]) {
  const maximo = recursos.reduce(
    (mayor, recurso) => Math.max(mayor, Number(recurso.codigo) || 0),
    0
  );

  return String(maximo + 1).padStart(3, "0");
}

function siguienteId(recursos: RecursoEditable[]) {
  return Math.max(Date.now(), ...recursos.map((recurso) => recurso.id + 1));
}

function escaparRegExp(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function VistaRecursos<T extends RecursoEditable>({
  recursos,
  setRecursos,
  prefijo,
  titulo,
  botonNuevo,
  nombreSingular,
  unidadInicial = "h",
  referencias,
  onRenombrarReferencia,
}: VistaRecursosProps<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [editandoNombre, setEditandoNombre] = useState<number | null>(null);
  const [nombreBorrador, setNombreBorrador] = useState("");
  const [menu, setMenu] = useState<MenuContextual | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState(unidadInicial);
  const [nuevaFormula, setNuevaFormula] = useState("");

  const nombreNuevoRef = useRef<HTMLInputElement>(null);
  const unidadNuevaRef = useRef<HTMLInputElement>(null);
  const formulaNuevaRef = useRef<HTMLInputElement>(null);
  const refsNombre = useRef(new Map<number, HTMLInputElement>());
  const formulasOriginales = useRef(new Map<number, string>());
  const creandoRecurso = useRef(false);
  const cancelandoNombre = useRef(false);
  const cancelandoFormula = useRef<number | null>(null);

  const resultados = useMemo(() => {
    const texto = normalizar(busqueda);
    if (!texto) return recursos;

    return recursos.filter((recurso) =>
      normalizar(`${prefijo}-${recurso.codigo} ${recurso.nombre}`).includes(texto)
    );
  }, [busqueda, prefijo, recursos]);

  const codigoNuevo = siguienteCodigo(recursos);

  const precioNuevo = useMemo(() => {
    if (!nuevaFormula.trim()) return null;

    return calcularPrecioRecurso(
      {
        tipo: prefijo,
        codigo: codigoNuevo,
        nombre: nuevoNombre,
        precio: 0,
        formula: nuevaFormula,
      },
      referencias
    );
  }, [codigoNuevo, nuevaFormula, nuevoNombre, prefijo, referencias]);

  useEffect(() => {
    if (editandoNombre === null) return;

    requestAnimationFrame(() => {
      const input = refsNombre.current.get(editandoNombre);
      input?.focus();
      input?.select();
    });
  }, [editandoNombre]);

  useEffect(() => {
    if (!menu) return;

    const cerrar = () => setMenu(null);
    window.addEventListener("click", cerrar);
    window.addEventListener("blur", cerrar);
    return () => {
      window.removeEventListener("click", cerrar);
      window.removeEventListener("blur", cerrar);
    };
  }, [menu]);

  function comenzarEdicionNombre(recurso: T) {
    setError("");
    setNombreBorrador(recurso.nombre);
    setEditandoNombre(recurso.id);
    setMenu(null);
  }

  function confirmarNombre(recurso: T) {
    const nombre = nombreBorrador.trim();

    if (!nombre) {
      setError("El nombre no puede estar vacío.");
      return false;
    }

    if (nombre.length > 60) {
      setError("El nombre no puede superar los 60 caracteres.");
      return false;
    }

    if (nombre !== recurso.nombre) {
      setRecursos((actuales) =>
        actuales.map((actual) =>
          actual.id === recurso.id
            ? { ...actual, nombre, ultimaModificacion: fechaHoy() }
            : actual
        )
      );
      onRenombrarReferencia?.(
        prefijo,
        recurso.codigo,
        recurso.nombre,
        nombre
      );
    }

    setEditandoNombre(null);
    setError("");
    return true;
  }

  function actualizarFormula(id: number, formula: string) {
    setError("");
    setRecursos((actuales) =>
      actuales.map((recurso) =>
        recurso.id === id
          ? { ...recurso, formula, ultimaModificacion: fechaHoy() }
          : recurso
      )
    );
  }

  function confirmarFormula(recurso: T) {
    if (recurso.formula.trim() && !recurso.formula.trim().startsWith("=")) {
      setError("La fórmula debe comenzar con =.");
      return false;
    }

    formulasOriginales.current.delete(recurso.id);
    setError("");
    return true;
  }

  function crearRecurso() {
    if (creandoRecurso.current) return;

    const nombre = nuevoNombre.trim();
    const unidad = nuevaUnidad.trim();
    const formula = nuevaFormula.trim();

    if (!nombre) {
      setError("Ingresá un nombre.");
      nombreNuevoRef.current?.focus();
      return;
    }
    if (nombre.length > 60) {
      setError("El nombre no puede superar los 60 caracteres.");
      nombreNuevoRef.current?.focus();
      return;
    }
    if (!unidad) {
      setError("Ingresá una unidad.");
      unidadNuevaRef.current?.focus();
      return;
    }
    if (formula && !formula.startsWith("=")) {
      setError("La fórmula debe comenzar con =.");
      formulaNuevaRef.current?.focus();
      return;
    }
    if (Number(codigoNuevo) > 999) {
      setError("No hay códigos disponibles en esta categoría.");
      return;
    }

    const nuevo = {
      id: siguienteId(recursos),
      codigo: codigoNuevo,
      nombre,
      unidad,
      precio: precioNuevo ?? 0,
      formula: formula || "=0",
      ultimaModificacion: fechaHoy(),
    } as T;

    creandoRecurso.current = true;
    setRecursos((actuales) => [...actuales, nuevo]);
    setNuevoNombre("");
    setNuevaUnidad(unidadInicial);
    setNuevaFormula("");
    setError("");
    requestAnimationFrame(() => {
      creandoRecurso.current = false;
      nombreNuevoRef.current?.focus();
    });
  }

  async function copiarNombre(nombre: string) {
    try {
      await navigator.clipboard.writeText(nombre);
      setError("");
    } catch {
      setError("No se pudo copiar el nombre al portapapeles.");
    } finally {
      setMenu(null);
    }
  }

  function duplicarRecurso(recurso: T) {
    const duplicado = {
      ...recurso,
      id: siguienteId(recursos),
      codigo: siguienteCodigo(recursos),
      ultimaModificacion: fechaHoy(),
    } as T;

    setRecursos((actuales) => {
      const indice = actuales.findIndex((actual) => actual.id === recurso.id);
      const copia = [...actuales];
      copia.splice(indice + 1, 0, duplicado);
      return copia;
    });
    setNombreBorrador(duplicado.nombre);
    setEditandoNombre(duplicado.id);
    setMenu(null);
  }

  function estaReferenciado(recurso: T) {
    const codigo = escaparRegExp(`${prefijo}-${recurso.codigo}`);
    const codigoCorto = escaparRegExp(recurso.codigo);
    const nombre = escaparRegExp(recurso.nombre);

    return referencias.some(
      (referencia) => {
        if (referencia.tipo === prefijo && referencia.codigo === recurso.codigo) {
          return false;
        }

        const alternativas =
          referencia.tipo === prefijo
            ? `${codigo}|${codigoCorto}|${nombre}`
            : `${codigo}|${nombre}`;

        return new RegExp(`\\[(?:${alternativas})\\]`, "i").test(
          referencia.formula
        );
      }
    );
  }

  function eliminarRecurso(recurso: T) {
    setMenu(null);
    if (estaReferenciado(recurso)) {
      setError(
        `${prefijo}-${recurso.codigo} está utilizado en otra fórmula y no puede eliminarse.`
      );
      return;
    }

    if (!window.confirm(`¿Eliminar ${prefijo}-${recurso.codigo} · ${recurso.nombre}?`)) {
      return;
    }

    setRecursos((actuales) =>
      actuales.filter((actual) => actual.id !== recurso.id)
    );
  }

  function abrirMenu(event: MouseEvent, id: number) {
    event.preventDefault();
    setMenu({ id, x: event.clientX, y: event.clientY });
  }

  function handleNombreKeyDown(event: KeyboardEvent<HTMLInputElement>, recurso: T) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelandoNombre.current = true;
      setEditandoNombre(null);
      setNombreBorrador(recurso.nombre);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (confirmarNombre(recurso)) {
        document.querySelector<HTMLInputElement>(
          `[data-recurso-id="${recurso.id}"][data-campo="formula"]`
        )?.focus();
      }
    }
  }

  function handleFormulaKeyDown(event: KeyboardEvent<HTMLInputElement>, recurso: T) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelandoFormula.current = recurso.id;
      const original = formulasOriginales.current.get(recurso.id);
      if (original !== undefined) actualizarFormula(recurso.id, original);
      event.currentTarget.blur();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (confirmarFormula(recurso)) nombreNuevoRef.current?.focus();
    }
  }

  const recursoMenu = menu
    ? recursos.find((recurso) => recurso.id === menu.id)
    : undefined;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Biblioteca del proyecto
          </div>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{titulo}</h1>
        </div>
        <div className="text-xs text-zinc-500">Base CONSCA 2026</div>
      </div>

      <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white p-2">
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por código o nombre..."
          className="h-10 flex-1 rounded-md border border-zinc-300 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#E6B012] focus:bg-white"
        />
        <button
          type="button"
          onClick={() => {
            setError("");
            nombreNuevoRef.current?.focus();
          }}
          className="h-10 rounded-md bg-[#E6B012] px-5 text-sm font-bold text-black hover:brightness-95"
        >
          {botonNuevo}
        </button>
      </div>

      <div className="mb-3 min-h-5 text-xs text-zinc-400">
        Doble clic para editar · Tab para avanzar · Enter para confirmar · Esc para cancelar
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">
        <div className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px] border-b border-zinc-300 bg-[#f7f7f5]">
          {['Tipo', 'Código', 'Nombre', 'Unidad', 'Precio', 'Fórmula', 'Últ. modificación'].map((tituloColumna) => (
            <div key={tituloColumna} className="border-r border-zinc-300 px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500 last:border-r-0">
              {tituloColumna}
            </div>
          ))}
        </div>

        {resultados.map((recurso) => (
          <div
            key={recurso.id}
            onContextMenu={(event) => abrirMenu(event, recurso.id)}
            className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px] border-b border-zinc-200 bg-white focus-within:bg-[#fffdf5] hover:bg-[#fffdf5]"
          >
            <Celda><span className="font-bold text-zinc-500">{prefijo}</span></Celda>
            <Celda><span className="font-semibold">{recurso.codigo}</span></Celda>
            <div className="border-r border-zinc-200">
              {editandoNombre === recurso.id ? (
                <input
                  ref={(elemento) => {
                    if (elemento) refsNombre.current.set(recurso.id, elemento);
                    else refsNombre.current.delete(recurso.id);
                  }}
                  value={nombreBorrador}
                  maxLength={60}
                  onChange={(event) => setNombreBorrador(event.target.value)}
                  onKeyDown={(event) => handleNombreKeyDown(event, recurso)}
                  onBlur={() => {
                    if (cancelandoNombre.current) {
                      cancelandoNombre.current = false;
                      return;
                    }
                    confirmarNombre(recurso);
                  }}
                  className="h-full w-full bg-transparent px-3 py-3 text-sm outline-none"
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => comenzarEdicionNombre(recurso)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") comenzarEdicionNombre(recurso);
                  }}
                  className="h-full w-full px-3 py-3 text-left text-sm text-zinc-800"
                  title="Doble clic para editar"
                >
                  {recurso.nombre}
                </button>
              )}
            </div>
            <Celda>{recurso.unidad}</Celda>
            <Celda derecha>
              {formatearMoneda(
                calcularPrecioRecurso(
                  { ...recurso, tipo: prefijo },
                  referencias
                ) ?? recurso.precio
              )}
            </Celda>
            <div className="border-r border-zinc-200 p-1.5">
              <input
                data-recurso-id={recurso.id}
                data-campo="formula"
                value={recurso.formula}
                onFocus={() => formulasOriginales.current.set(recurso.id, recurso.formula)}
                onChange={(event) => actualizarFormula(recurso.id, event.target.value)}
                onKeyDown={(event) => handleFormulaKeyDown(event, recurso)}
                onBlur={() => {
                  if (cancelandoFormula.current === recurso.id) {
                    cancelandoFormula.current = null;
                    return;
                  }
                  confirmarFormula(recurso);
                }}
                placeholder={`Ej: =[${prefijo}-001]*1.2`}
                className="h-8 w-full rounded border border-transparent bg-transparent px-2 font-mono text-xs text-zinc-600 outline-none hover:border-zinc-300 focus:border-[#E6B012] focus:bg-white"
              />
            </div>
            <div className="px-3 py-3 text-sm text-zinc-500">
              {recurso.ultimaModificacion}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px] bg-[#fffdf5]">
          <Celda><span className="font-bold text-zinc-400">{prefijo}</span></Celda>
          <Celda><span className="font-semibold text-zinc-400">{codigoNuevo}</span></Celda>
          <Campo>
            <input
              ref={nombreNuevoRef}
              value={nuevoNombre}
              maxLength={60}
              onChange={(event) => { setError(""); setNuevoNombre(event.target.value); }}
              onKeyDown={(event) => {
                if (event.key === "Escape") { setNuevoNombre(""); event.currentTarget.blur(); }
                if (event.key === "Enter") { event.preventDefault(); unidadNuevaRef.current?.focus(); unidadNuevaRef.current?.select(); }
              }}
              placeholder="Nuevo recurso..."
              aria-label={`Nuevo ${nombreSingular}`}
              className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#E6B012] focus:bg-white"
            />
          </Campo>
          <Campo>
            <input
              ref={unidadNuevaRef}
              value={nuevaUnidad}
              onChange={(event) => setNuevaUnidad(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") { setNuevaUnidad(unidadInicial); event.currentTarget.blur(); }
                if (event.key === "Enter") { event.preventDefault(); formulaNuevaRef.current?.focus(); formulaNuevaRef.current?.select(); }
              }}
              className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-[#E6B012] focus:bg-white"
            />
          </Campo>
          <Celda derecha>{precioNuevo === null ? "—" : formatearMoneda(precioNuevo)}</Celda>
          <Campo>
            <input
              ref={formulaNuevaRef}
              value={nuevaFormula}
              onChange={(event) => setNuevaFormula(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") { setNuevaFormula(""); event.currentTarget.blur(); }
                if (event.key === "Enter") { event.preventDefault(); crearRecurso(); }
              }}
              placeholder="=0"
              className="h-9 w-full rounded border border-transparent bg-transparent px-2 font-mono text-xs outline-none focus:border-[#E6B012] focus:bg-white"
            />
          </Campo>
          <div className="flex items-center px-3 text-xs text-zinc-400">
            Enter para agregar
          </div>
        </div>
      </div>

      <div className="mt-2 text-right text-xs text-zinc-400">
        {recursos.length} registros en la biblioteca del proyecto
      </div>

      {menu && recursoMenu && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[100] w-52 overflow-hidden rounded-lg border border-zinc-300 bg-white py-1 shadow-xl"
        >
          <OpcionMenu onClick={() => comenzarEdicionNombre(recursoMenu)}>Editar nombre</OpcionMenu>
          <OpcionMenu onClick={() => duplicarRecurso(recursoMenu)}>Duplicar recurso</OpcionMenu>
          <OpcionMenu onClick={() => { void copiarNombre(recursoMenu.nombre); }}>
            Copiar nombre
          </OpcionMenu>
          <div className="my-1 border-t border-zinc-200" />
          <OpcionMenu peligro onClick={() => eliminarRecurso(recursoMenu)}>Eliminar recurso</OpcionMenu>
        </div>
      )}
    </div>
  );
}

function Celda({ children, derecha = false }: { children: React.ReactNode; derecha?: boolean }) {
  return (
    <div className={`border-r border-zinc-200 px-3 py-3 text-sm text-zinc-800 ${derecha ? "text-right" : ""}`}>
      {children}
    </div>
  );
}

function Campo({ children }: { children: React.ReactNode }) {
  return <div className="border-r border-zinc-200 p-1.5">{children}</div>;
}

function OpcionMenu({ children, onClick, peligro = false }: { children: React.ReactNode; onClick: () => void; peligro?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 ${peligro ? "text-red-600" : "text-zinc-700"}`}
    >
      {children}
    </button>
  );
}
