"use client";

import { useEffect, useState } from "react";

export function useEstadoPersistido<T>(clave: string, valorInicial: T) {
  const [valor, setValor] = useState(valorInicial);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    queueMicrotask(() => {
      if (cancelado) return;

      try {
        const guardado = window.localStorage.getItem(clave);
        if (guardado !== null) setValor(JSON.parse(guardado) as T);
      } catch {
        // Si el almacenamiento no está disponible, se conserva el estado en memoria.
      } finally {
        setCargado(true);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [clave]);

  useEffect(() => {
    if (!cargado) return;

    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // La aplicación continúa funcionando aunque el navegador bloquee localStorage.
    }
  }, [cargado, clave, valor]);

  return [valor, setValor] as const;
}
