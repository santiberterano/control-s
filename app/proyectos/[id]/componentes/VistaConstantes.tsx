"use client";

import VistaEquipos, { type Equipo } from "./VistaEquipos";
import type { RecursoCalculable } from "./calculosRecursos";
import type { PrefijoRecurso } from "./VistaRecursos";

export type Constante = Equipo;

type VistaConstantesProps = {
  constantes: Constante[];
  setConstantes: React.Dispatch<React.SetStateAction<Constante[]>>;
  referencias: RecursoCalculable[];
  onRenombrarReferencia?: (
    tipo: PrefijoRecurso,
    codigo: string,
    nombreAnterior: string,
    nombreNuevo: string
  ) => void;
};

export default function VistaConstantes({
  constantes,
  setConstantes,
  referencias,
  onRenombrarReferencia,
}: VistaConstantesProps) {
  return (
    <VistaEquipos
      equipos={constantes}
      setEquipos={setConstantes}
      prefijo="CON"
      titulo="Constantes"
      botonNuevo="+ Nueva constante"
      nombreSingular="la constante"
      unidadInicial="ARS"
      referencias={referencias}
      onRenombrarReferencia={onRenombrarReferencia}
    />
  );
}
