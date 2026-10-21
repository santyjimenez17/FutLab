
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const competition = url.searchParams.get("competition") || "ALL";

  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar FOOTBALL_API_KEY." },
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

  const apiUrl =
    "https://api.football-data.org/v4/matches?" +
    params.toString();

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "X-Auth-Token": env.FOOTBALL_API_KEY,
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: data.message ||
            "No se pudieron obtener los partidos."
        },
        { status: response.status }
      );
    }

    const matches = (data.matches || []).map(match => {
      const homeTeam = match.homeTeam || {};
      const awayTeam = match.awayTeam || {};
      const score = match.score || {};

      return {
        id: match.id,
        utcDate: match.utcDate,
        status: match.status || "SCHEDULED",

        competition:
          match.competition?.name ||
          "Competición",

        homeTeam:
          homeTeam.name ||
          homeTeam.shortName ||
          homeTeam.tla ||
          "Local por definir",

        awayTeam:
          awayTeam.name ||
          awayTeam.shortName ||
          awayTeam.tla ||
          "Visitante por definir",

        homeScore:
          score.fullTime?.home ??
          score.halfTime?.home ??
          null,

        awayScore:
          score.fullTime?.away ??
          score.halfTime?.away ??
          null,

        minute: match.minute ?? null,
        injuryTime: match.injuryTime ?? null
      };
    });

    return Response.json(
      {
        matches,
        count: matches.length,
        updatedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      {
        error: "Error al conectar con football-data.org."
      },
      { status: 502 }
    );
  }
}
