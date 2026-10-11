"use client";

import VistaRecursos, {
  type PrefijoRecurso,
  type RecursoEditable,
} from "./VistaRecursos";
import type { RecursoCalculable } from "./calculosRecursos";

export type Equipo = RecursoEditable;

type VistaEquiposProps = {
  equipos: Equipo[];
  setEquipos: React.Dispatch<React.SetStateAction<Equipo[]>>;
  prefijo?: "ALQ" | "SUB" | "CON";
  titulo?: string;
  botonNuevo?: string;
  nombreSingular?: string;
  unidadInicial?: string;
  referencias: RecursoCalculable[];
  onRenombrarReferencia?: (
    tipo: PrefijoRecurso,
    codigo: string,
    nombreAnterior: string,
    nombreNuevo: string
  ) => void;
};

export default function VistaEquipos({
  equipos,
  setEquipos,
  prefijo = "ALQ",
  titulo = "Equipos",
  botonNuevo = "+ Nuevo equipo",
  nombreSingular = "equipo",
  unidadInicial = "h",
  referencias,
  onRenombrarReferencia,
}: VistaEquiposProps) {
  return (
    <VistaRecursos
      recursos={equipos}
      setRecursos={setEquipos}
      prefijo={prefijo}
      titulo={titulo}
      botonNuevo={botonNuevo}
      nombreSingular={nombreSingular}
      unidadInicial={unidadInicial}
      referencias={referencias}
      onRenombrarReferencia={onRenombrarReferencia}
    />
  );
}
