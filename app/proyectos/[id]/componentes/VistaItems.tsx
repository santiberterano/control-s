"use client";

import {
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ItemPresupuesto } from "../page";

type VistaItemsProps = {
  items: ItemPresupuesto[];
  setItems: React.Dispatch<
    React.SetStateAction<ItemPresupuesto[]>
  >;
};

function parseNumero(numero: string) {
  const [principal, secundario] = numero.split("-");

  return {
    principal: Number(principal),
    secundario:
      secundario !== undefined ? Number(secundario) : null,
  };
}

function ordenarItems(
  a: ItemPresupuesto,
  b: ItemPresupuesto
) {
  const na = parseNumero(a.numero);
  const nb = parseNumero(b.numero);

  if (na.principal !== nb.principal) {
    return na.principal - nb.principal;
  }

  if (na.secundario === null && nb.secundario !== null) {
    return -1;
  }

  if (na.secundario !== null && nb.secundario === null) {
    return 1;
  }

  if (na.secundario === null && nb.secundario === null) {
    return 0;
  }

  return (na.secundario ?? 0) - (nb.secundario ?? 0);
}

function numeroValido(valor: string) {
  return /^[1-9]\d*(?:-[1-9]\d*)?$/.test(valor);
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function VistaItems({
  items,
  setItems,
}: VistaItemsProps) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] =
    useState("");

  const [error, setError] = useState("");

  const numeroNuevoRef = useRef<HTMLInputElement>(null);
  const descripcionNuevaRef =
    useRef<HTMLInputElement>(null);

  const totalCosto = useMemo(() => {
    return items.reduce(
      (acumulado, item) => acumulado + item.subtotal,
      0
    );
  }, [items]);

  function limpiarError() {
    if (error) {
      setError("");
    }
  }

  function numeroDuplicado(
    numero: string,
    ignorarId?: number
  ) {
    return items.some(
      (item) =>
        item.numero === numero &&
        item.id !== ignorarId
    );
  }

  function agregarNuevoItem() {
    const numero = nuevoNumero.trim();
    const descripcion = nuevaDescripcion.trim();

    if (!numero && !descripcion) {
      numeroNuevoRef.current?.focus();
      return;
    }

    if (!numero) {
      setError("Ingresá un número de ítem.");
      numeroNuevoRef.current?.focus();
      return;
    }

    if (!numeroValido(numero)) {
      setError(
        "El número debe ser un entero mayor a 0, con un solo guion opcional."
      );
      numeroNuevoRef.current?.focus();
      return;
    }

    if (numeroDuplicado(numero)) {
      setError(`El ítem ${numero} ya existe.`);
      numeroNuevoRef.current?.focus();
      return;
    }

    if (!descripcion) {
      setError("Ingresá una descripción.");
      descripcionNuevaRef.current?.focus();
      return;
    }

    const nuevoItem: ItemPresupuesto = {
      id: Date.now(),
      numero,
      descripcion,
      subtotal: 0,
    };

    setItems((actuales) =>
      [...actuales, nuevoItem].sort(ordenarItems)
    );

    setNuevoNumero("");
    setNuevaDescripcion("");
    setError("");

    setTimeout(() => {
      numeroNuevoRef.current?.focus();
    }, 0);
  }

  function actualizarItem(
    id: number,
    campo: "numero" | "descripcion",
    valor: string
  ) {
    limpiarError();

    setItems((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function confirmarEdicion(id: number) {
    const item = items.find((item) => item.id === id);

    if (!item) return;

    const numero = item.numero.trim();
    const descripcion = item.descripcion.trim();

    if (!numeroValido(numero)) {
      setError(
        "El número debe ser un entero mayor a 0, con un solo guion opcional."
      );
      return;
    }

    if (numeroDuplicado(numero, id)) {
      setError(`El ítem ${numero} ya existe.`);
      return;
    }

    if (!descripcion) {
      setError("La descripción no puede estar vacía.");
      return;
    }

    setItems((actuales) =>
      actuales
        .map((item) =>
          item.id === id
            ? {
                ...item,
                numero,
                descripcion,
              }
            : item
        )
        .sort(ordenarItems)
    );

    setError("");
  }

  function eliminarItem(id: number) {
    setItems((actuales) =>
      actuales.filter((item) => item.id !== id)
    );
  }

  function handleNuevoNumeroKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!nuevoNumero.trim()) {
        return;
      }

      descripcionNuevaRef.current?.focus();
    }

    if (event.key === "ArrowRight") {
      if (nuevoNumero.trim()) {
        descripcionNuevaRef.current?.focus();
      }
    }
  }

  function handleNuevaDescripcionKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      agregarNuevoItem();
    }

    if (event.key === "ArrowLeft") {
      if (
        event.currentTarget.selectionStart === 0 &&
        event.currentTarget.selectionEnd === 0
      ) {
        numeroNuevoRef.current?.focus();
      }
    }
  }

  function limpiarNumero(valor: string) {
    let limpio = valor.replace(/[^0-9-]/g, "");

    const partes = limpio.split("-");

    if (partes.length > 2) {
      limpio =
        partes[0] +
        "-" +
        partes.slice(1).join("");
    }

    return limpio;
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Proyecto 26031
          </div>

          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            Items
          </h1>
        </div>

        <div className="text-xs text-zinc-500">
          Biblioteca del proyecto · Base CONSCA 2026
        </div>
      </div>

      <div className="mb-3 flex min-h-6 items-center justify-between">
        <div className="text-xs text-zinc-400">
          Tab para avanzar · Enter o ↓ para confirmar
        </div>

        {error && (
          <div className="text-xs font-medium text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">

        <div className="grid grid-cols-[120px_1fr_220px_46px] border-b border-zinc-300 bg-[#f7f7f5]">

          <div className="border-r border-zinc-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Nº
          </div>

          <div className="border-r border-zinc-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Item
          </div>

          <div className="border-r border-zinc-300 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Subtotal
          </div>

          <div />

        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[120px_1fr_220px_46px] border-b border-zinc-200 bg-white focus-within:bg-[#fffdf5]"
          >

            <div className="border-r border-zinc-200">
              <input
                value={item.numero}
                onChange={(event) =>
                  actualizarItem(
                    item.id,
                    "numero",
                    limpiarNumero(event.target.value)
                  )
                }
                onBlur={() =>
                  confirmarEdicion(item.id)
                }
                className="h-full w-full bg-transparent px-4 py-3 font-medium text-zinc-900 outline-none"
              />
            </div>

            <div className="border-r border-zinc-200">
              <input
                value={item.descripcion}
                onChange={(event) =>
                  actualizarItem(
                    item.id,
                    "descripcion",
                    event.target.value
                  )
                }
                onBlur={() =>
                  confirmarEdicion(item.id)
                }
                className="h-full w-full bg-transparent px-4 py-3 text-zinc-900 outline-none"
              />
            </div>

            <div className="border-r border-zinc-200 px-4 py-3 text-right font-medium text-zinc-800">
              {formatearMoneda(item.subtotal)}
            </div>

            <button
              type="button"
              onClick={() => eliminarItem(item.id)}
              title="Eliminar ítem"
              className="text-lg text-zinc-300 transition hover:bg-red-50 hover:text-red-500"
            >
              ×
            </button>

          </div>
        ))}

        <div className="grid grid-cols-[120px_1fr_220px_46px] bg-[#fffdf5]">

          <div className="border-r border-zinc-200">
            <input
              ref={numeroNuevoRef}
              value={nuevoNumero}
              onChange={(event) => {
                limpiarError();

                setNuevoNumero(
                  limpiarNumero(event.target.value)
                );
              }}
              onKeyDown={handleNuevoNumeroKeyDown}
              placeholder="Nº"
              className="h-full w-full bg-transparent px-4 py-3 font-medium text-zinc-900 outline-none placeholder:text-zinc-300"
            />
          </div>

          <div className="border-r border-zinc-200">
            <input
              ref={descripcionNuevaRef}
              value={nuevaDescripcion}
              onChange={(event) => {
                limpiarError();
                setNuevaDescripcion(event.target.value);
              }}
              onKeyDown={handleNuevaDescripcionKeyDown}
              placeholder="Nuevo ítem..."
              className="h-full w-full bg-transparent px-4 py-3 text-zinc-900 outline-none placeholder:text-zinc-300"
            />
          </div>

          <div className="border-r border-zinc-200 px-4 py-3 text-right text-zinc-300">
            —
          </div>

          <div />

        </div>

        <div className="grid grid-cols-[1fr_220px_46px] border-t border-zinc-400 bg-[#f2f2ef]">

          <div className="px-4 py-4 text-right text-sm font-bold uppercase tracking-[0.08em]">
            Total costo
          </div>

          <div className="border-l border-r border-zinc-300 px-4 py-4 text-right text-lg font-bold">
            {formatearMoneda(totalCosto)}
          </div>

          <div />

        </div>

      </div>
    </div>
  );
}