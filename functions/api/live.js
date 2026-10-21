
export async function onRequestGet({ env }) {
  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar FOOTBALL_API_KEY." },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dateFrom: today,
    dateTo: today
  });

  try {
    const response = await fetch(
      "https://api.football-data.org/v4/matches?" +
        params.toString(),
      {
        headers: {
          "X-Auth-Token": env.FOOTBALL_API_KEY,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            data.message ||
            "No se pudieron consultar los partidos."
        },
        { status: response.status }
      );
    }

    const matches = (data.matches || [])
      .filter(match =>
        ["IN_PLAY", "PAUSED"].includes(match.status)
      )
      .map(match => ({
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,
        competition:
          match.competition?.name || "Competición",
        homeTeam:
          match.homeTeam?.name || "Local",
        awayTeam:
          match.awayTeam?.name || "Visitante",
        homeScore:
          match.score?.fullTime?.home ?? null,
        awayScore:
          match.score?.fullTime?.away ?? null
      }));

    return Response.json(
      {
        updatedAt: new Date().toISOString(),
        count: matches.length,
        matches
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { error: "Error al conectar con football-data.org." },
      { status: 502 }
    );
  }
}
