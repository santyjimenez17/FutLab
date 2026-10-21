
const LIGAS = new Set([
  "PL", "PD", "BL1", "SA", "FL1",
  "DED", "PPL", "BSA", "ELC"
]);

export async function onRequestGet({ request, env }) {
  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta la clave de la API en Cloudflare." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const liga = (url.searchParams.get("liga") || "PL")
    .toUpperCase();

  if (!LIGAS.has(liga)) {
    return Response.json(
      { error: "Elige una liga disponible." },
      { status: 400 }
    );
  }

  try {
    const respuesta = await fetch(
      `https://api.football-data.org/v4/competitions/${liga}/standings`,
      {
        headers: {
          "X-Auth-Token": env.FOOTBALL_API_KEY
        },
        cf: {
          cacheEverything: true,
          cacheTtl: 600
        }
      }
    );

    if (!respuesta.ok) {
      return Response.json(
        {
          error: "No se pudo consultar la clasificación.",
          status: respuesta.status
        },
        { status: respuesta.status === 429 ? 429 : 502 }
      );
    }

    const datos = await respuesta.json();

    const tabla = datos.standings?.find(
      grupo => grupo.type === "TOTAL"
    );

    const equipos = (tabla?.table || []).map(fila => ({
      id: fila.team.id,
      nombre: fila.team.name,
      escudo: fila.team.crest,
      posicion: fila.position,
      jugados: fila.playedGames,
      ganados: fila.won,
      empatados: fila.draw,
      perdidos: fila.lost,
      golesFavor: fila.goalsFor,
      golesContra: fila.goalsAgainst,
      diferencia: fila.goalDifference,
      puntos: fila.points
    }));

    return Response.json({
      source: "football-data.org",
      liga,
      competicion: datos.competition?.name || liga,
      jornada: datos.season?.currentMatchday ?? null,
      equipos
    });

  } catch {
    return Response.json(
      { error: "Error de conexión con los datos deportivos." },
      { status: 502 }
    );
  }
}
