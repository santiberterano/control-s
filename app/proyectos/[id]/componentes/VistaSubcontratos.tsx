"use client";

import VistaEquipos, { type Equipo } from "./VistaEquipos";
import type { RecursoCalculable } from "./calculosRecursos";
import type { PrefijoRecurso } from "./VistaRecursos";

export type Subcontrato = Equipo;

type VistaSubcontratosProps = {
  subcontratos: Subcontrato[];
  setSubcontratos: React.Dispatch<React.SetStateAction<Subcontrato[]>>;
  referencias: RecursoCalculable[];
  onRenombrarReferencia?: (
    tipo: PrefijoRecurso,
    codigo: string,
    nombreAnterior: string,
    nombreNuevo: string
  ) => void;
};

export default function VistaSubcontratos({
  subcontratos,
  setSubcontratos,
  referencias,
  onRenombrarReferencia,
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
      onRenombrarReferencia={onRenombrarReferencia}
    />
  );
}
