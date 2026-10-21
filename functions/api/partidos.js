
export async function onRequestGet({ env }) {
  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar FOOTBALL_API_KEY en Cloudflare Pages." },
      { status: 500 }
    );
  }

  try {
    const respuesta = await fetch(
      "https://api.football-data.org/v4/matches",
      {
        headers: {
          "X-Auth-Token": env.FOOTBALL_API_KEY
        }
      }
    );

    if (!respuesta.ok) {
      return Response.json(
        {
          error: "No se pudieron obtener los partidos.",
          status: respuesta.status
        },
        { status: 502 }
      );
    }

    const datos = await respuesta.json();

    const partidos = (datos.matches || []).map(partido => ({
      id: partido.id,
      competition: partido.competition?.name ?? "",
      utcDate: partido.utcDate,
      status: partido.status,
      homeTeam: partido.homeTeam?.name ?? "Por definir",
      awayTeam: partido.awayTeam?.name ?? "Por definir",
      homeScore: partido.score?.fullTime?.home ?? null,
      awayScore: partido.score?.fullTime?.away ?? null
    }));

    return Response.json({
      source: "football-data.org",
      count: partidos.length,
      matches: partidos
    });

  } catch {
    return Response.json(
      { error: "No fue posible conectar con el proveedor de datos." },
      { status: 502 }
    );
  }
}
