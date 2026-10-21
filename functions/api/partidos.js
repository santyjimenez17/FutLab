
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const competition = url.searchParams.get("competition") || "ALL";

  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "No está configurada la clave de la API." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();

  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  if (competition !== "ALL") {
    params.set("competitions", competition);
  }

  try {
    const response = await fetch(
      "https://api.football-data.org/v4/matches?" +
      params.toString(),
      {
        headers: {
          "X-Auth-Token": env.FOOTBALL_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: data.message ||
            "No se pudieron cargar los partidos."
        },
        { status: response.status }
      );
    }

    const matches = (data.matches || []).map(match => ({
      id: match.id,
      utcDate: match.utcDate,
      status: match.status,
      competition:
        match.competition?.name || "Competición",
      homeTeam:
        match.homeTeam?.name ||
        match.homeTeam?.shortName ||
        "Por definir",
      awayTeam:
        match.awayTeam?.name ||
        match.awayTeam?.shortName ||
        "Por definir",
      homeScore:
        match.score?.fullTime?.home ?? null,
      awayScore:
        match.score?.fullTime?.away ?? null
    }));

    return Response.json(
      { matches },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      {
        error: "Error de conexión con football-data.org."
      },
      { status: 502 }
    );
  }
}
