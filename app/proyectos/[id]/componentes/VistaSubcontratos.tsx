"use client";

import VistaEquipos, { type Equipo } from "./VistaEquipos";
import type { RecursoCalculable } from "./calculosRecursos";

export type Subcontrato = Equipo;

type VistaSubcontratosProps = {
  subcontratos: Subcontrato[];
  setSubcontratos: React.Dispatch<React.SetStateAction<Subcontrato[]>>;
  referencias: RecursoCalculable[];
};

export default function VistaSubcontratos({
  subcontratos,
  setSubcontratos,
  referencias,
}: VistaSubcontratosProps) {
  return (
    <VistaEquipos
      equipos={subcontratos}
      setEquipos={setSubcontratos}
      prefijo="SUB"
      titulo="Subcontratos"
      botonNuevo="+ Nuevo subcontrato"
      nombreSingular="subcontrato"
      referencias={referencias}
    />
  );
}
