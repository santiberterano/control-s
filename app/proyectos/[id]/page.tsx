"use client";

import { useState } from "react";
import Ribbon from "./componentes/Ribbon";
import VistaItems from "./componentes/VistaItems";
import VistaPresupuesto from "./componentes/VistaPresupuesto";
import VistaManoDeObra, {
  type ManoDeObra,
} from "./componentes/VistaManoDeObra";
import VistaEquipos, {
  type Equipo,
} from "./componentes/VistaEquipos";
import VistaSubcontratos, {
  type Subcontrato,
} from "./componentes/VistaSubcontratos";
import VistaConstantes, {
  type Constante,
} from "./componentes/VistaConstantes";
import { calcularPrecioRecurso, codigoVisibleRecurso, type RecursoCalculable } from "./componentes/calculosRecursos";
import { useEstadoPersistido } from "./componentes/useEstadoPersistido";
import VistaInsumos, {
  categoriasIniciales,
  type CategoriaInsumo,
  type Insumo,
} from "./componentes/VistaInsumos";
import VistaApu from "./componentes/VistaApu";
import type { Apu, FamiliaApu, RecursoApu } from "./componentes/apu";
import type { PartidaPresupuesto, RubroPresupuesto } from "./componentes/presupuesto";

export type ItemPresupuesto = {
  id: number;
  numero: string;
  descripcion: string;
  subtotal: number;
  apuId?: number;
  cantidad?: number;
};

export default function ProyectoPage() {
  const [activeSection, setActiveSection] = useState("Items");

  const [items] = useEstadoPersistido<ItemPresupuesto[]>(
    "ctrl-s:26031:items",
    [
    {
      id: 1,
      numero: "1",
      descripcion: "Trabajos preliminares",
      subtotal: 4250000,
    },
    {
      id: 2,
      numero: "2",
      descripcion: "Movimiento de suelos",
      subtotal: 7830000,
    },
    {
      id: 3,
      numero: "3",
      descripcion: "Estructura",
      subtotal: 38450000,
    },
    ]
  );
  const [rubros, setRubros] = useEstadoPersistido<RubroPresupuesto[]>("ctrl-s:26031:rubros-presupuesto", []);
  const [partidas, setPartidas] = useEstadoPersistido<PartidaPresupuesto[]>("ctrl-s:26031:partidas-presupuesto", []);

  const [categoriasInsumos, setCategoriasInsumos] = useEstadoPersistido<CategoriaInsumo[]>(
    "ctrl-s:26031:categorias-insumos",
    categoriasIniciales()
  );
  const [insumos, setInsumos] = useEstadoPersistido<Insumo[]>(
    "ctrl-s:26031:insumos",
    []
  );
  const [apus, setApus] = useEstadoPersistido<Apu[]>("ctrl-s:biblioteca:apus", []);
  const [familiasApu, setFamiliasApu] = useEstadoPersistido<FamiliaApu[]>("ctrl-s:biblioteca:familias-apu", []);

  const [manoDeObra, setManoDeObra] = useEstadoPersistido<ManoDeObra[]>(
    "ctrl-s:26031:mano-de-obra",
    [
    {
      id: 1,
      codigo: "001",
      nombre: "Oficial albañil",
      unidad: "h",
      precio: 8500,
      formula: "",
      ultimaModificacion: "20/9/2026",
    },
    {
      id: 2,
      codigo: "002",
      nombre: "Ayudante",
      unidad: "h",
      precio: 6700,
      formula: "",
      ultimaModificacion: "20/9/2026",
    },
    {
      id: 3,
      codigo: "003",
      nombre: "Capataz",
      unidad: "h",
      precio: 12325,
      formula: "=[DOLAR]*8.5",
      ultimaModificacion: "20/9/2026",
    },
    ]
  );

  const [equipos, setEquipos] = useEstadoPersistido<Equipo[]>(
    "ctrl-s:26031:equipos",
    [
    {
      id: 1,
      codigo: "001",
      nombre: "Hormigonera",
      unidad: "h",
      precio: 18500,
      formula: "=18500",
      ultimaModificacion: "20/9/2026",
    },
    {
      id: 2,
      codigo: "002",
      nombre: "Retroexcavadora",
      unidad: "h",
      precio: 95000,
      formula: "=95000",
      ultimaModificacion: "20/9/2026",
    },
    ]
  );

  const [subcontratos, setSubcontratos] = useEstadoPersistido<Subcontrato[]>(
    "ctrl-s:26031:subcontratos",
    [
    {
      id: 1,
      codigo: "001",
      nombre: "Instalación eléctrica",
      unidad: "gl",
      precio: 2500000,
      formula: "=2500000",
      ultimaModificacion: "20/9/2026",
    },
    ]
  );

  const [constantes, setConstantes] = useEstadoPersistido<Constante[]>(
    "ctrl-s:26031:constantes",
    [
    {
      id: 1,
      codigo: "001",
      nombre: "Dólar",
      unidad: "ARS",
      precio: 1450,
      formula: "=1450",
      ultimaModificacion: "20/9/2026",
    },
    ]
  );

  const referencias: RecursoCalculable[] = [
    ...insumos.map((registro) => ({ ...registro, tipo: "INS" as const })),
    ...manoDeObra.map((registro) => ({ ...registro, tipo: "MDO" as const })),
    ...equipos.map((registro) => ({ ...registro, tipo: "ALQ" as const })),
    ...subcontratos.map((registro) => ({ ...registro, tipo: "SUB" as const })),
    ...constantes.map((registro) => ({ ...registro, tipo: "CON" as const })),
  ];

  const recursosApu: RecursoApu[] = [
    ...insumos.map((recurso) => ({ ...recurso, tipo: "INS" as const, precio: calcularPrecioRecurso({ ...recurso, tipo: "INS" as const }, referencias) ?? recurso.precio })),
    ...manoDeObra.map((recurso) => ({ ...recurso, codigo: codigoVisibleRecurso("MDO", recurso.codigo), tipo: "MDO" as const, precio: calcularPrecioRecurso({ ...recurso, tipo: "MDO" as const }, referencias) ?? recurso.precio })),
    ...equipos.map((recurso) => ({ ...recurso, codigo: codigoVisibleRecurso("ALQ", recurso.codigo), tipo: "ALQ" as const, precio: calcularPrecioRecurso({ ...recurso, tipo: "ALQ" as const }, referencias) ?? recurso.precio })),
    ...subcontratos.map((recurso) => ({ ...recurso, codigo: codigoVisibleRecurso("SUB", recurso.codigo), tipo: "SUB" as const, precio: calcularPrecioRecurso({ ...recurso, tipo: "SUB" as const }, referencias) ?? recurso.precio })),
    ...constantes.map((recurso) => ({ ...recurso, codigo: codigoVisibleRecurso("CON", recurso.codigo), tipo: "CON" as const, precio: calcularPrecioRecurso({ ...recurso, tipo: "CON" as const }, referencias) ?? recurso.precio })),
  ];

  return (
    <main className="min-h-screen bg-[#f4f4f2]">
      <Ribbon
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <section className="px-6 pb-10 pt-[125px]">
        <div className="mx-auto max-w-[1600px]">

          {activeSection === "Items" && (
            <VistaItems
              itemsLegacy={items}
              rubros={rubros}
              setRubros={setRubros}
              partidas={partidas}
            />
          )}

          {activeSection === "Presupuesto" && (
            <VistaPresupuesto
              itemsLegacy={items}
              rubros={rubros}
              setRubros={setRubros}
              partidas={partidas}
              setPartidas={setPartidas}
              apus={apus}
              recursos={recursosApu}
            />
          )}

          {activeSection === "Insumos" && (
            <VistaInsumos
              categorias={categoriasInsumos}
              setCategorias={setCategoriasInsumos}
              insumos={insumos}
              setInsumos={setInsumos}
              referencias={referencias}
            />
          )}

          {activeSection === "APU" && (
            <VistaApu apus={apus} setApus={setApus} familias={familiasApu} setFamilias={setFamiliasApu} recursos={recursosApu} />
          )}

          {activeSection === "Mano de obra" && (
            <VistaManoDeObra
              manoDeObra={manoDeObra}
              setManoDeObra={setManoDeObra}
              referencias={referencias}
            />
          )}

          {activeSection === "Equipos" && (
            <VistaEquipos
              equipos={equipos}
              setEquipos={setEquipos}
              referencias={referencias}
            />
          )}

          {activeSection === "Subcontratos" && (
            <VistaSubcontratos
              subcontratos={subcontratos}
              setSubcontratos={setSubcontratos}
              referencias={referencias}
            />
          )}

          {activeSection === "Constantes" && (
            <VistaConstantes
              constantes={constantes}
              setConstantes={setConstantes}
              referencias={referencias}
            />
          )}

          {activeSection !== "Items" &&
            activeSection !== "Presupuesto" &&
            activeSection !== "Insumos" &&
            activeSection !== "APU" &&
            activeSection !== "Mano de obra" &&
            activeSection !== "Equipos" &&
            activeSection !== "Subcontratos" &&
            activeSection !== "Constantes" && (
            <div className="min-h-[600px] rounded-lg border border-zinc-300 bg-white">

              <div className="flex h-10 items-center border-b border-zinc-200 bg-[#f7f7f5] px-4">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {activeSection}
                </span>
              </div>

              <div className="flex min-h-[560px] items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-semibold text-zinc-700">
                    {activeSection}
                  </div>

                  <p className="mt-2 text-sm text-zinc-400">
                    Esta sección la vamos a construir más adelante.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>
    </main>
  );
}
