export default function BibliotecaPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f2] p-10">

      <div className="mx-auto max-w-6xl">

        <h1 className="text-3xl font-bold text-zinc-900">
          Biblioteca
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Base CONSCA 2026
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">

          {[
            "APU",
            "Insumos",
            "Precios",
            "Constantes",
            "Familias",
          ].map((item) => (
            <button
              key={item}
              className="rounded-xl border border-zinc-200 bg-white p-6 text-left font-semibold text-zinc-800 hover:border-[#E6B012]"
            >
              {item}
            </button>
          ))}

        </div>

      </div>

    </main>
  );
}