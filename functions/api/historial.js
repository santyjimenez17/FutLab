
const LIGAS = new Set([
  "PL", "PD", "BL1", "SA", "FL1",
  "DED", "PPL", "BSA", "ELC", "CL"
]);

export async function onRequestGet({ request, env }) {
  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar la API Key." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);

  const equipo = url.searchParams.get("equipo");
  const liga = (
    url.searchParams.get("liga") || "PL"
  ).toUpperCase();

  if (!equipo || !/^\d+$/.test(equipo)) {
    return Response.json(
      { error: "ID de equipo no válido." },
      { status: 400 }
    );
  }

  if (!LIGAS.has(liga)) {
    return Response.json(
      { error: "Competición no válida." },
      { status: 400 }
    );
  }

  try {
    const api = new URL(
      `https://api.football-data.org/v4/teams/${equipo}/matches`
    );

    api.searchParams.set("status", "FINISHED");
    api.searchParams.set("limit", "10");
    api.searchParams.set("competitions", liga);

    const respuesta = await fetch(api.toString(), {
      headers: {
        "X-Auth-Token": env.FOOTBALL_API_KEY
      },
      cf: {
        cacheEverything: true,
        cacheTtl: 600
      }
    });

    if (!respuesta.ok) {
      return Response.json(
        {
          error: "No se pudo consultar el historial.",
          status: respuesta.status
        },
        { status: respuesta.status === 429 ? 429 : 502 }
      );
    }

    const datos = await respuesta.json();

    const matches = (datos.matches || [])
      .filter(p => p.status === "FINISHED")
      .map(p => ({
        id: p.id,
        utcDate: p.utcDate,
        competition: p.competition?.name ?? "",
        homeId: p.homeTeam?.id ?? null,
        awayId: p.awayTeam?.id ?? null,
        homeTeam: p.homeTeam?.name ?? "Por definir",
        awayTeam: p.awayTeam?.name ?? "Por definir",
        homeScore: p.score?.fullTime?.home ?? null,
        awayScore: p.score?.fullTime?.away ?? null
      }))
      .filter(p =>
        p.homeScore !== null &&
        p.awayScore !== null
      )
      .sort((a, b) =>
        new Date(b.utcDate) - new Date(a.utcDate)
      )
      .slice(0, 10);

    return Response.json({
      source: "football-data.org",
      teamId: Number(equipo),
      competition: liga,
      count: matches.length,
      matches
    });

  } catch {
    return Response.json(
      { error: "Error de conexión con la API." },
      { status: 502 }
    );
  }
}
