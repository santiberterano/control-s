export type RecursoCalculable = {
  tipo: "MDO" | "ALQ" | "SUB" | "CON";
  codigo: string;
  nombre: string;
  precio: number;
  formula: string;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function evaluarOperacion(expresion: string) {
  let posicion = 0;

  function omitirEspacios() {
    while (/\s/.test(expresion[posicion] ?? "")) posicion += 1;
  }

  function leerNumero(): number | null {
    omitirEspacios();
    const coincidencia = expresion
      .slice(posicion)
      .match(/^(?:\d+(?:[.,]\d+)?|[.,]\d+)/);

    if (!coincidencia) return null;

    posicion += coincidencia[0].length;
    return Number(coincidencia[0].replace(",", "."));
  }

  function leerFactor(): number | null {
    omitirEspacios();

    if (expresion[posicion] === "+" || expresion[posicion] === "-") {
      const signo = expresion[posicion] === "-" ? -1 : 1;
      posicion += 1;
      const factor = leerFactor();
      return factor === null ? null : signo * factor;
    }

    if (expresion[posicion] === "(") {
      posicion += 1;
      const valor = leerSuma();
      omitirEspacios();

      if (expresion[posicion] !== ")") return null;

      posicion += 1;
      return valor;
    }

    return leerNumero();
  }

  function leerProducto(): number | null {
    let valor = leerFactor();
    if (valor === null) return null;

    while (true) {
      omitirEspacios();
      const operador = expresion[posicion];

      if (operador !== "*" && operador !== "/") break;

      posicion += 1;
      const siguiente = leerFactor();
      if (siguiente === null || (operador === "/" && siguiente === 0)) {
        return null;
      }

      valor = operador === "*" ? valor * siguiente : valor / siguiente;
    }

    return valor;
  }

  function leerSuma(): number | null {
    let valor = leerProducto();
    if (valor === null) return null;

    while (true) {
      omitirEspacios();
      const operador = expresion[posicion];

      if (operador !== "+" && operador !== "-") break;

      posicion += 1;
      const siguiente = leerProducto();
      if (siguiente === null) return null;

      valor = operador === "+" ? valor + siguiente : valor - siguiente;
    }

    return valor;
  }

  const resultado = leerSuma();
  omitirEspacios();

  return resultado !== null && posicion === expresion.length && Number.isFinite(resultado)
    ? resultado
    : null;
}

function buscarReferencia(
  referencia: string,
  origen: RecursoCalculable,
  recursos: RecursoCalculable[]
) {
  const texto = normalizar(referencia);
  const codigoCompleto = texto.match(/^(MDO|ALQ|SUB|CON)-(\d{3})$/);

  if (codigoCompleto) {
    return recursos.find(
      (recurso) =>
        recurso.tipo === codigoCompleto[1] &&
        recurso.codigo === codigoCompleto[2]
    );
  }

  if (/^\d{3}$/.test(texto)) {
    return recursos.find(
      (recurso) => recurso.tipo === origen.tipo && recurso.codigo === texto
    );
  }

  return (
    recursos.find(
      (recurso) => recurso.tipo === "CON" && normalizar(recurso.nombre) === texto
    ) ?? recursos.find((recurso) => normalizar(recurso.nombre) === texto)
  );
}

export function calcularPrecioRecurso(
  recurso: RecursoCalculable,
  recursos: RecursoCalculable[],
  visitados = new Set<string>()
): number | null {
  const formula = recurso.formula.trim();
  const clave = `${recurso.tipo}-${recurso.codigo}`;

  if (!formula) return recurso.precio;
  if (!formula.startsWith("=") || visitados.has(clave)) return null;

  const siguientesVisitados = new Set(visitados).add(clave);
  let referenciaSinResolver = false;

  const expresion = formula.slice(1).replace(
    /\[([^\]]+)\]/g,
    (_coincidencia, referencia: string) => {
      const referenciado = buscarReferencia(referencia, recurso, recursos);

      if (!referenciado) {
        referenciaSinResolver = true;
        return "0";
      }

      const precio = calcularPrecioRecurso(
        referenciado,
        recursos,
        siguientesVisitados
      );

      if (precio === null) {
        referenciaSinResolver = true;
        return "0";
      }

      return String(precio);
    }
  );

  if (referenciaSinResolver) return null;

  const resultado = evaluarOperacion(expresion);
  return resultado !== null && resultado >= 0 ? resultado : null;
}
