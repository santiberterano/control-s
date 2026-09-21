export default function EstadisticasPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f2] p-10">

      <div className="mx-auto max-w-6xl">

        <div className="flex items-center gap-3">

          <h1 className="text-3xl font-bold text-zinc-900">
            Estadísticas
          </h1>

          <span className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold tracking-wider text-white">
            ADMIN
          </span>

        </div>

        <p className="mt-1 text-sm text-zinc-500">
          Información histórica y análisis de presupuestos.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="text-sm text-zinc-500">
              Presupuestos
            </div>

            <div className="mt-3 text-3xl font-bold">
              0
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="text-sm text-zinc-500">
              Proyectos adjudicados
            </div>

            <div className="mt-3 text-3xl font-bold">
              0
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="text-sm text-zinc-500">
              Base histórica
            </div>

            <div className="mt-3 text-3xl font-bold">
              —
            </div>
          </div>

        </div>

      </div>

    </main>
  );
}