"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  function ingresar() {
    localStorage.setItem("ctrls-session", "activa");
    localStorage.setItem("ctrls-last-activity", Date.now().toString());

    router.push("/home");
  }

  return (
    <main className="flex min-h-screen bg-[#f4f4f2]">

      {/* LADO IZQUIERDO */}
      <section className="relative hidden w-1/2 overflow-hidden bg-[#17191b] text-white lg:flex">

        <div className="absolute inset-0 bg-gradient-to-br from-[#2b2d30] via-[#17191b] to-black" />

        <div className="absolute -left-40 top-40 h-[480px] w-[480px] rotate-45 bg-[#E6B012]/80" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">

          <div className="text-xs leading-6 tracking-[0.35em] text-zinc-300">
            PLANIFICAR
            <br />
            ESTIMAR
            <br />
            CONSTRUIR
          </div>

          <div className="text-xs leading-6 tracking-[0.35em] text-zinc-300">
            IDEAS
            <br />
            EN OBRAS
            <br />
            REALES
          </div>

        </div>

      </section>

      {/* LADO DERECHO */}
      <section className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-1/2">

        {/* MARCA */}
        <div className="mb-6 flex flex-col items-center">

          <div className="mb-4 flex items-center gap-1">

            <div className="h-8 w-8 rotate-45 border-b-[8px] border-l-[8px] border-[#16191c]" />

            <div className="h-8 w-8 rotate-45 border-r-[8px] border-t-[8px] border-[#E6B012]" />

          </div>

          <h1 className="text-4xl font-black tracking-[0.14em] text-[#16191c]">
            CTRL S
          </h1>

          <p className="mt-2 text-[10px] tracking-[0.35em] text-zinc-500">
            PRESUPUESTACIÓN DE OBRAS
          </p>

        </div>

        {/* LOGIN */}
        <div className="w-full max-w-[400px] rounded-xl border border-zinc-200 bg-white p-7 shadow-xl shadow-black/5">

          <h2 className="text-xl font-bold text-[#1f2327]">
            Ingresá a tu cuenta
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Accedé al sistema para continuar.
          </p>

          <div className="mt-5 space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Usuario
              </label>

              <input
                type="text"
                placeholder="Usuario"
                className="w-full rounded-md border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#E6B012] focus:ring-2 focus:ring-[#E6B012]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Contraseña
              </label>

              <input
                type="password"
                placeholder="Contraseña"
                className="w-full rounded-md border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#E6B012] focus:ring-2 focus:ring-[#E6B012]/20"
              />
            </div>

            <button
              type="button"
              onClick={ingresar}
              className="mt-1 w-full rounded-md bg-[#E6B012] py-2.5 text-sm font-bold tracking-[0.12em] text-black transition hover:brightness-95"
            >
              INGRESAR →
            </button>

          </div>

        </div>

        <div className="mt-8 text-center">

          <div className="text-xs tracking-[0.15em] text-zinc-600">
            CTRL S ·{" "}
            <span className="font-bold text-[#16191c]">
              CONSCA
            </span>
            <span className="font-bold text-[#E6B012]">
              +
            </span>
          </div>

          <p className="mt-2 text-[9px] tracking-[0.25em] text-zinc-400">
            v0.1.0
          </p>

        </div>

      </section>

    </main>
  );
}