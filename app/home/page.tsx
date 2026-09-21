"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f4f4f2]">

      {/* CABECERA */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-8">

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-0.5">
            <div className="h-5 w-5 rotate-45 border-b-[5px] border-l-[5px] border-[#16191c]" />
            <div className="h-5 w-5 rotate-45 border-r-[5px] border-t-[5px] border-[#E6B012]" />
          </div>

          <span className="text-lg font-black tracking-[0.12em] text-[#16191c]">
            CTRL S
          </span>

        </div>

        <div className="text-sm text-zinc-500">
          Santiago · Admin 1
        </div>

      </header>

      <section className="mx-auto max-w-6xl px-10 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-900">
            Inicio
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            ¿Qué querés hacer?
          </p>
        </div>

        {/* OPCIONES */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* ABRIR PROYECTO */}
          <button
            onClick={() => router.push("/proyectos")}
            className="group col-span-1 min-h-[220px] rounded-xl bg-[#E6B012] p-7 text-left transition hover:brightness-95 lg:col-span-2"
          >
            <div className="flex h-full flex-col justify-between">

              <div className="text-4xl">
                📁
              </div>

              <div>
                <h2 className="text-2xl font-bold text-black">
                  Abrir proyecto
                </h2>

                <p className="mt-2 max-w-md text-sm text-black/70">
                  Buscar, abrir o continuar trabajando sobre un presupuesto.
                </p>
              </div>

            </div>
          </button>

          {/* BIBLIOTECA */}
          <button
            onClick={() => router.push("/biblioteca")}
            className="min-h-[220px] rounded-xl border border-zinc-200 bg-white p-7 text-left transition hover:border-zinc-400"
          >

            <div className="flex h-full flex-col justify-between">

              <div className="text-3xl">
                ◫
              </div>

              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  Biblioteca
                </h2>

                <p className="mt-1 text-sm font-medium text-[#b88700]">
                  Base CONSCA 2026
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  APU, insumos, precios, constantes y familias.
                </p>
              </div>

            </div>

          </button>

          {/* ESTADÍSTICAS */}
          <button
            onClick={() => router.push("/estadisticas")}
            className="min-h-[170px] rounded-xl border border-zinc-200 bg-white p-7 text-left transition hover:border-zinc-400"
          >

            <div className="flex h-full flex-col justify-between">

              <div className="text-3xl">
                ◩
              </div>

              <div>
                <div className="flex items-center gap-2">

                  <h2 className="text-xl font-bold text-zinc-900">
                    Estadísticas
                  </h2>

                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white">
                    ADMIN
                  </span>

                </div>

                <p className="mt-2 text-sm text-zinc-500">
                  Análisis históricos, comparativas e indicadores.
                </p>
              </div>

            </div>

          </button>

        </div>

        {/* RECIENTES */}
        <div className="mt-12">

          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-500">
            Proyectos recientes
          </h2>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">

            <div className="border-b border-zinc-100 px-5 py-4 hover:bg-zinc-50">
              <div className="font-medium text-zinc-900">
                26031 · Edificio Varese
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Modificado recientemente
              </div>
            </div>

            <div className="border-b border-zinc-100 px-5 py-4 hover:bg-zinc-50">
              <div className="font-medium text-zinc-900">
                26032 · Vivienda Rumencó
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                En presupuesto
              </div>
            </div>

            <div className="px-5 py-4 hover:bg-zinc-50">
              <div className="font-medium text-zinc-900">
                26033 · Nave Industrial
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                En presupuesto
              </div>
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}