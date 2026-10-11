"use client";

import VistaRecursos, {
  type PrefijoRecurso,
  type RecursoEditable,
} from "./VistaRecursos";
import type { RecursoCalculable } from "./calculosRecursos";

export type ManoDeObra = RecursoEditable;

type VistaManoDeObraProps = {
  manoDeObra: ManoDeObra[];
  setManoDeObra: React.Dispatch<React.SetStateAction<ManoDeObra[]>>;
  referencias: RecursoCalculable[];
  onRenombrarReferencia?: (
    tipo: PrefijoRecurso,
    codigo: string,
    nombreAnterior: string,
    nombreNuevo: string
  ) => void;
};

export default function VistaManoDeObra({
  manoDeObra,
  setManoDeObra,
  referencias,
  onRenombrarReferencia,
}: VistaManoDeObraProps) {
  return (
    <VistaRecursos
      recursos={manoDeObra}
      setRecursos={setManoDeObra}
      prefijo="MDO"
      titulo="Mano de obra"
      botonNuevo="+ Nueva MDO"
      nombreSingular="mano de obra"
      referencias={referencias}
      onRenombrarReferencia={onRenombrarReferencia}
    />
  );
}
