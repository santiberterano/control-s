"use client";

import { useMemo, useState } from "react";
import {
  calcularPrecioRecurso,
  type RecursoCalculable,
} from "./calculosRecursos";

export type ManoDeObra = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  formula: string;
  ultimaModificacion: string;
};

type VistaManoDeObraProps = {
  manoDeObra: ManoDeObra[];
  setManoDeObra: React.Dispatch<
    React.SetStateAction<ManoDeObra[]>
  >;
  referencias: RecursoCalculable[];
};

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(valor);
}

function fechaHoy() {
  return new Intl.DateTimeFormat("es-AR").format(new Date());
}

function evaluarOperacion(expresion: string) {
  let posicion = 0;

  function omitirEspacios() {
    while (/\s/.test(expresion[posicion] ?? "")) posicion += 1;
  }

  function leerNumero(): number | null {
    omitirEspacios();

    const coincidencia = expresion
      .slice(posicion)
      .match(/^(?:\d+(?:[.,]\d+)?|[.,]\d+)/);

    if (!coincidencia) return null;

    posicion += coincidencia[0].length;
    return Number(coincidencia[0].replace(",", "."));
  }

  function leerFactor(): number | null {
    omitirEspacios();

    if (expresion[posicion] === "+" || expresion[posicion] === "-") {
      const signo = expresion[posicion] === "-" ? -1 : 1;
      posicion += 1;
      const factor = leerFactor();
      return factor === null ? null : signo * factor;
    }

    if (expresion[posicion] === "(") {
      posicion += 1;
      const valor = leerSuma();
      omitirEspacios();

      if (expresion[posicion] !== ")") return null;

      posicion += 1;
      return valor;
    }

    return leerNumero();
  }

  function leerProducto(): number | null {
    let valor = leerFactor();
    if (valor === null) return null;

    while (true) {
      omitirEspacios();
      const operador = expresion[posicion];

      if (operador !== "*" && operador !== "/") break;

      posicion += 1;
      const siguiente = leerFactor();
      if (siguiente === null || (operador === "/" && siguiente === 0)) {
        return null;
      }

      valor = operador === "*" ? valor * siguiente : valor / siguiente;
    }

    return valor;
  }

  function leerSuma(): number | null {
    let valor = leerProducto();
    if (valor === null) return null;

    while (true) {
      omitirEspacios();
      const operador = expresion[posicion];

      if (operador !== "+" && operador !== "-") break;

      posicion += 1;
      const siguiente = leerProducto();
      if (siguiente === null) return null;

      valor = operador === "+" ? valor + siguiente : valor - siguiente;
    }

    return valor;
  }

  const resultado = leerSuma();
  omitirEspacios();

  return resultado !== null && posicion === expresion.length && Number.isFinite(resultado)
    ? resultado
    : null;
}

function calcularPrecio(
  registro: ManoDeObra,
  registros: ManoDeObra[],
  visitados = new Set<number>()
): number | null {
  const formula = registro.formula.trim();

  if (!formula) return registro.precio;
  if (!formula.startsWith("=") || visitados.has(registro.id)) return null;

  const siguientesVisitados = new Set(visitados).add(registro.id);
  let referenciaSinResolver = false;

  const expresion = formula.slice(1).replace(
    /\[([^\]]+)\]/g,
    (_coincidencia, referencia: string) => {
      const codigo = referencia
        .trim()
        .toUpperCase()
        .match(/^(?:MDO-)?(\d{3})$/)?.[1];

      const referenciado = codigo
        ? registros.find((item) => item.codigo === codigo)
        : undefined;

      if (!referenciado) {
        referenciaSinResolver = true;
        return "0";
      }

      const precio = calcularPrecio(
        referenciado,
        registros,
        siguientesVisitados
      );

      if (precio === null) {
        referenciaSinResolver = true;
        return "0";
      }

      return String(precio);
    }
  );

  if (referenciaSinResolver) return null;

  const resultado = evaluarOperacion(expresion);
  return resultado !== null && resultado >= 0 ? resultado : null;
}

function recalcularPrecios(registros: ManoDeObra[]) {
  return registros.map((registro) => ({
    ...registro,
    precio: calcularPrecio(registro, registros) ?? registro.precio,
  }));
}

export default function VistaManoDeObra({
  manoDeObra,
  setManoDeObra,
  referencias,
}: VistaManoDeObraProps) {
  const [busqueda, setBusqueda] = useState("");
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [error, setError] = useState("");

  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("h");
  const [nuevaFormula, setNuevaFormula] = useState("");

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return manoDeObra;
    }

    return manoDeObra.filter((registro) => {
      const codigoCompleto =
        `MDO-${registro.codigo}`.toLowerCase();

      return (
        codigoCompleto.includes(texto) ||
        registro.codigo.includes(texto) ||
        registro.nombre.toLowerCase().includes(texto)
      );
    });
  }, [busqueda, manoDeObra]);

  const precioNuevo = useMemo(() => {
    if (!nuevaFormula.trim()) return null;

    const nuevoRecurso: RecursoCalculable = {
      tipo: "MDO",
      codigo: nuevoCodigo,
      nombre: nuevoNombre,
      unidad: nuevaUnidad,
      precio: 0,
      formula: nuevaFormula,
    } as RecursoCalculable & { unidad: string };

    return calcularPrecioRecurso(
      nuevoRecurso,
      [...referencias, nuevoRecurso]
    );
  }, [referencias, nuevaFormula, nuevoCodigo, nuevoNombre, nuevaUnidad]);

  function limpiarCodigo(valor: string) {
    return valor.replace(/\D/g, "").slice(0, 3);
  }

  function codigoValido(codigo: string) {
    return /^\d{3}$/.test(codigo);
  }

  function codigoDuplicado(codigo: string) {
    return manoDeObra.some(
      (registro) => registro.codigo === codigo
    );
  }

  function crearNuevaMDO() {
    const codigo = nuevoCodigo.trim();
    const nombre = nuevoNombre.trim();
    const unidad = nuevaUnidad.trim();
    const formula = nuevaFormula.trim();

    if (!codigoValido(codigo)) {
      setError(
        "El código debe tener exactamente 3 números."
      );
      return;
    }

    if (codigoDuplicado(codigo)) {
      setError(`MDO-${codigo} ya existe.`);
      return;
    }

    if (!nombre) {
      setError("Ingresá un nombre.");
      return;
    }

    if (nombre.length > 60) {
      setError(
        "El nombre no puede superar los 60 caracteres."
      );
      return;
    }

    if (!unidad) {
      setError("Ingresá una unidad.");
      return;
    }

    if (!formula) {
      setError("Ingresá una fórmula para calcular el precio.");
      return;
    }

    if (!formula.startsWith("=")) {
      setError("La fórmula debe comenzar con =.");
      return;
    }

    const nuevoRegistro: ManoDeObra = {
      id: Date.now(),
      codigo,
      nombre,
      unidad,
      precio: precioNuevo ?? 0,
      formula,
      ultimaModificacion: fechaHoy(),
    };

    setManoDeObra((actual) =>
      recalcularPrecios([...actual, nuevoRegistro]).sort(
        (a, b) => Number(a.codigo) - Number(b.codigo)
      )
    );

    cancelarCreacion();
  }

  function cancelarCreacion() {
    setNuevoCodigo("");
    setNuevoNombre("");
    setNuevaUnidad("h");
    setNuevaFormula("");
    setError("");
    setCreandoNueva(false);
  }

  function actualizarFormula(id: number, formula: string) {
    setError("");

    setManoDeObra((actual) =>
      recalcularPrecios(
        actual.map((registro) =>
          registro.id === id
            ? {
                ...registro,
                formula,
                ultimaModificacion: fechaHoy(),
              }
            : registro
        )
      )
    );
  }

  function validarFormula(formula: string) {
    if (formula.trim() && !formula.trim().startsWith("=")) {
      setError("La fórmula debe comenzar con =.");
    }
  }

  return (
    <div>
      {/* TITULO */}

      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Biblioteca del proyecto
          </div>

          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            Mano de obra
          </h1>
        </div>

        <div className="text-xs text-zinc-500">
          Base CONSCA 2026
        </div>
      </div>

      {/* SEGUNDA BARRA */}

      <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white p-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            ⌕
          </span>

          <input
            type="text"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
            placeholder="Buscar por código o nombre..."
            className="h-10 w-full rounded-md border border-zinc-300 bg-[#fafafa] pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-[#E6B012] focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setCreandoNueva(true);
            setError("");
          }}
          className="h-10 rounded-md bg-[#E6B012] px-5 text-sm font-bold text-black transition hover:brightness-95"
        >
          + Nueva MDO
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* TABLA */}

      <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">
        {/* CABECERA */}

        <div className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px] border-b border-zinc-300 bg-[#f7f7f5]">
          <Cabecera>Tipo</Cabecera>
          <Cabecera>Código</Cabecera>
          <Cabecera>Nombre</Cabecera>
          <Cabecera>Unidad</Cabecera>
          <Cabecera derecha>Precio</Cabecera>
          <Cabecera>Fórmula</Cabecera>

          <div className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Últ. modificación
          </div>
        </div>

        {/* REGISTROS */}

        {resultados.map((registro) => (
          <div
            key={registro.id}
            className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px] border-b border-zinc-200 last:border-b-0 hover:bg-[#fffdf5]"
          >
            <Celda>
              <span className="font-bold text-zinc-500">
                MDO
              </span>
            </Celda>

            <Celda>
              <span className="font-semibold">
                {registro.codigo}
              </span>
            </Celda>

            <Celda>{registro.nombre}</Celda>

            <Celda>{registro.unidad}</Celda>

            <Celda derecha>
              <span className="font-medium">
                {formatearMoneda(
                  calcularPrecioRecurso(
                    {
                      tipo: "MDO",
                      codigo: registro.codigo,
                      nombre: registro.nombre,
                      precio: registro.precio,
                      formula: registro.formula,
                    },
                    referencias
                  ) ?? registro.precio
                )}
              </span>
            </Celda>

            <div className="border-r border-zinc-200 p-1.5">
              <input
                value={registro.formula}
                onChange={(event) =>
                  actualizarFormula(registro.id, event.target.value)
                }
                onBlur={() => validarFormula(registro.formula)}
                placeholder="Ej: =[MDO-001]*1.2"
                className="h-8 w-full rounded border border-transparent bg-transparent px-2 font-mono text-xs text-zinc-600 outline-none hover:border-zinc-300 focus:border-[#E6B012] focus:bg-white"
              />
            </div>

            <div className="px-3 py-3 text-sm text-zinc-500">
              {registro.ultimaModificacion}
            </div>
          </div>
        ))}

        {/* NUEVA MDO */}

        {creandoNueva && (
          <div className="border-t-2 border-[#E6B012] bg-[#fffdf5]">
            <div className="grid grid-cols-[80px_90px_minmax(240px,1fr)_100px_160px_minmax(220px,1fr)_150px]">
              {/* MDO FIJO */}

              <div className="flex items-center border-r border-zinc-200 px-3 py-2 font-bold text-zinc-600">
                MDO
              </div>

              {/* CODIGO */}

              <div className="border-r border-zinc-200 p-1.5">
                <input
                  autoFocus
                  value={nuevoCodigo}
                  onChange={(event) => {
                    setError("");
                    setNuevoCodigo(
                      limpiarCodigo(event.target.value)
                    );
                  }}
                  placeholder="001"
                  inputMode="numeric"
                  className="h-9 w-full rounded border border-zinc-300 bg-white px-2 text-sm font-semibold outline-none focus:border-[#E6B012]"
                />
              </div>

              {/* NOMBRE */}

              <div className="border-r border-zinc-200 p-1.5">
                <input
                  value={nuevoNombre}
                  maxLength={60}
                  onChange={(event) => {
                    setError("");
                    setNuevoNombre(event.target.value);
                  }}
                  placeholder="Nombre de mano de obra"
                  className="h-9 w-full rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-[#E6B012]"
                />
              </div>

              {/* UNIDAD */}

              <div className="border-r border-zinc-200 p-1.5">
                <input
                  value={nuevaUnidad}
                  onChange={(event) => {
                    setError("");
                    setNuevaUnidad(event.target.value);
                  }}
                  placeholder="h"
                  className="h-9 w-full rounded border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-[#E6B012]"
                />
              </div>

              {/* PRECIO */}

              <div className="flex items-center justify-end border-r border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700">
                {precioNuevo === null
                  ? "—"
                  : formatearMoneda(precioNuevo)}
              </div>

              {/* FORMULA */}

              <div className="border-r border-zinc-200 p-1.5">
                <input
                  value={nuevaFormula}
                  onChange={(event) => {
                    setError("");
                    setNuevaFormula(event.target.value);
                  }}
                  placeholder="Ej: =[DOLAR]*7.5"
                  className="h-9 w-full rounded border border-zinc-300 bg-white px-2 font-mono text-sm outline-none focus:border-[#E6B012]"
                />
              </div>

              {/* ACCIONES */}

              <div className="flex items-center justify-center gap-2 px-2">
                <button
                  type="button"
                  onClick={crearNuevaMDO}
                  title="Guardar"
                  className="rounded bg-[#E6B012] px-3 py-2 text-xs font-bold text-black hover:brightness-95"
                >
                  Guardar
                </button>

                <button
                  type="button"
                  onClick={cancelarCreacion}
                  title="Cancelar"
                  className="rounded px-2 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-400">
              Fórmulas: podés usar otros registros como [MDO-001] o
              constantes como [DOLAR]. Ejemplo:{" "}
              <span className="font-mono text-zinc-600">
                =[MDO-001]*1.2
              </span>
            </div>
          </div>
        )}

        {/* SIN RESULTADOS */}

        {resultados.length === 0 && !creandoNueva && (
          <div className="px-5 py-10 text-center">
            <div className="text-sm font-medium text-zinc-600">
              No se encontraron registros.
            </div>

            <div className="mt-1 text-xs text-zinc-400">
              Más adelante esta búsqueda también consultará la
              Biblioteca CONSCA.
            </div>
          </div>
        )}
      </div>

      {/* PIE */}

      <div className="mt-2 text-right text-xs text-zinc-400">
        {manoDeObra.length} registros en la biblioteca del proyecto
      </div>
    </div>
  );
}

function Cabecera({
  children,
  derecha = false,
}: {
  children: React.ReactNode;
  derecha?: boolean;
}) {
  return (
    <div
      className={`border-r border-zinc-300 px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500 ${
        derecha ? "text-right" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Celda({
  children,
  derecha = false,
}: {
  children: React.ReactNode;
  derecha?: boolean;
}) {
  return (
    <div
      className={`border-r border-zinc-200 px-3 py-3 text-sm text-zinc-800 ${
        derecha ? "text-right" : ""
      }`}
    >
      {children}
    </div>
  );
}
