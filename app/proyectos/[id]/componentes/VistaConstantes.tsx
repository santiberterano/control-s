"use client";

import VistaEquipos, { type Equipo } from "./VistaEquipos";
import type { RecursoCalculable } from "./calculosRecursos";

export type Constante = Equipo;

type VistaConstantesProps = {
  constantes: Constante[];
  setConstantes: React.Dispatch<React.SetStateAction<Constante[]>>;
  referencias: RecursoCalculable[];
};

export default function VistaConstantes({
  constantes,
  setConstantes,
  referencias,
}: VistaConstantesProps) {
  return (
    <VistaEquipos
      equipos={constantes}
      setEquipos={setConstantes}
      prefijo="CON"
      titulo="Constantes"
      botonNuevo="+ Nueva constante"
      nombreSingular="la constante"
      referencias={referencias}
    />
  );
}
