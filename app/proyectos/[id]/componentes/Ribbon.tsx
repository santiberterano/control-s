"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RibbonProps = {
  activeSection: string;
  setActiveSection: (section: string) => void;
};

const menuItems = [
  "Archivo",
  "Items",
  "Presupuesto",
  "APU",
  "Insumos",
  "Mano de obra",
  "Equipos",
  "Subcontratos",
  "Constantes",
  "Seguimiento",
];

export default function Ribbon({
  activeSection,
  setActiveSection,
}: RibbonProps) {
  const router = useRouter();

  const [activeMenu, setActiveMenu] =
    useState<string | null>(null);

  const [saveStatus, setSaveStatus] =
    useState("Guardado");

  function toggleMenu(menu: string) {
    if (
      menu === "Archivo" ||
      menu === "Seguimiento"
    ) {
      setActiveMenu(
        activeMenu === menu ? null : menu
      );

      return;
    }

    setActiveMenu(null);
    setActiveSection(menu);
  }

  function simulateSave(message: string) {
    setSaveStatus("Guardando...");

    setTimeout(() => {
      setSaveStatus(message);

      setTimeout(() => {
        setSaveStatus("Guardado");
      }, 1200);

    }, 700);
  }

  function volverAlHome() {
    setActiveMenu(null);

    setSaveStatus(
      "Guardando proyecto y biblioteca..."
    );

    setTimeout(() => {
      router.push("/home");
    }, 900);
  }

  return (
    <>
      {/* CABECERA SUPERIOR */}

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-300 bg-[#1b1d1f] px-5 text-white">

        <div className="flex items-center gap-6">

          {/* MARCA */}

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-0.5">

              <div className="h-4 w-4 rotate-45 border-b-[4px] border-l-[4px] border-white" />

              <div className="h-4 w-4 rotate-45 border-r-[4px] border-t-[4px] border-[#E6B012]" />

            </div>

            <span className="text-sm font-black tracking-[0.14em]">
              CTRL S
            </span>

          </div>

          {/* PROYECTO */}

          <div className="border-l border-zinc-600 pl-6">

            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Proyecto activo
            </div>

            <div className="text-sm font-semibold">
              26031 · Edificio Varese
            </div>

          </div>

        </div>

        {/* ESTADO */}

        <div className="flex items-center gap-5">

          <div className="flex items-center gap-2 text-xs text-zinc-300">

            <span
              className={`h-2 w-2 rounded-full ${
                saveStatus === "Guardado"
                  ? "bg-green-500"
                  : "bg-[#E6B012]"
              }`}
            />

            {saveStatus}

          </div>

          <div className="text-xs text-zinc-400">
            Santiago · Admin 1
          </div>

        </div>

      </header>

      {/* RIBBON */}

      <nav className="fixed left-0 right-0 top-14 z-40 border-b border-zinc-300 bg-white">

        <div className="flex h-11 items-stretch px-3">

          {menuItems.map((item) => {

            const isDropdown =
              item === "Archivo" ||
              item === "Seguimiento";

            const isSelected =
              activeSection === item ||
              activeMenu === item;

            return (
              <div
                key={item}
                className="relative flex items-stretch"
              >

                <button
                  type="button"
                  onClick={() =>
                    toggleMenu(item)
                  }
                  className={`relative px-4 text-sm font-medium transition ${
                    isSelected
                      ? "bg-[#f2f2ef] text-black"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
                  }`}
                >

                  {item}

                  {isSelected && (
                    <div className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#E6B012]" />
                  )}

                </button>

                {/* MENU ARCHIVO */}

                {isDropdown &&
                  item === "Archivo" &&
                  activeMenu === "Archivo" && (

                    <div className="absolute left-0 top-full z-50 w-[320px] overflow-hidden rounded-b-lg border border-t-0 border-zinc-300 bg-white shadow-xl">

                      <div className="p-2">

                        <button
                          type="button"
                          onClick={() => {
                            simulateSave(
                              "Proyecto guardado"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Guardar proyecto
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Guarda los datos propios del presupuesto.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            simulateSave(
                              "Biblioteca guardada"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Guardar biblioteca
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Guarda la biblioteca propia de este proyecto.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            simulateSave(
                              "Proyecto y biblioteca guardados"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md bg-[#E6B012]/10 px-4 py-3 text-left hover:bg-[#E6B012]/20"
                        >
                          <div className="text-sm font-bold text-zinc-900">
                            Guardar ambos
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-600">
                            Guarda proyecto + biblioteca del proyecto.
                          </div>
                        </button>

                        <div className="my-2 border-t border-zinc-200" />

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);

                            alert(
                              "Más adelante acá abriremos el comparador para retroalimentar la Biblioteca CONSCA."
                            );
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >

                          <div className="text-sm font-semibold text-zinc-900">
                            Retroalimentar Biblioteca CONSCA
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Comparar e incorporar cambios de forma explícita.
                          </div>

                        </button>

                        <div className="my-2 border-t border-zinc-200" />

                        <button
                          type="button"
                          onClick={volverAlHome}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Volver al Home
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Guarda automáticamente antes de salir.
                          </div>
                        </button>

                        <div className="my-2 border-t border-zinc-200" />

                        <div className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          Exportar
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);
                            alert(
                              "Exportar presupuesto"
                            );
                          }}
                          className="w-full rounded-md px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                        >
                          Exportar presupuesto
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);
                            alert(
                              "Exportar biblioteca"
                            );
                          }}
                          className="w-full rounded-md px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                        >
                          Exportar biblioteca
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenu(null);
                            alert(
                              "Exportar legajo"
                            );
                          }}
                          className="w-full rounded-md px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                        >
                          Exportar legajo
                        </button>

                      </div>

                    </div>
                  )}

                {/* MENU SEGUIMIENTO */}

                {isDropdown &&
                  item === "Seguimiento" &&
                  activeMenu === "Seguimiento" && (

                    <div className="absolute left-0 top-full z-50 w-[300px] overflow-hidden rounded-b-lg border border-t-0 border-zinc-300 bg-white shadow-xl">

                      <div className="p-2">

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection(
                              "Diagrama de Gantt previsto"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Diagrama de Gantt previsto
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Planificación estimada de la obra.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection(
                              "Diagrama de Gantt real"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Diagrama de Gantt real
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Seguimiento real del avance de obra.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection(
                              "Análisis"
                            );

                            setActiveMenu(null);
                          }}
                          className="w-full rounded-md px-4 py-3 text-left hover:bg-zinc-100"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            Análisis
                          </div>

                          <div className="mt-0.5 text-xs text-zinc-500">
                            Comparación entre lo previsto y la ejecución real.
                          </div>
                        </button>

                      </div>

                    </div>
                  )}

              </div>
            );
          })}

        </div>

      </nav>
    </>
  );
}
