
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const competition = url.searchParams.get("competition");

  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar FOOTBALL_API_KEY." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();

  if (dateFrom && dateTo) {
    params.set("dateFrom", dateFrom);
    params.set("dateTo", dateTo);
  }

  if (competition && competition !== "ALL") {
    params.set("competitions", competition);
  }

  const apiUrl =
    "https://api.football-data.org/v4/matches?" +
    params.toString();

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "X-Auth-Token": env.FOOTBALL_API_KEY
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

    const matches = (data.matches || []).map(m => {
      const status = m.status || "SCHEDULED";

      // En partidos en curso, football-data.org puede
      // proporcionar el marcador en fullTime.
      const score = m.score?.fullTime || {};

      return {
        id: m.id,
        utcDate: m.utcDate,
        status,
        competition:
          m.competition?.name || "Competición",
        homeTeam:
          m.homeTeam?.name || "Por definir",
        awayTeam:
          m.awayTeam?.name || "Por definir",
        homeScore: score.home ?? null,
        awayScore: score.away ?? null,
        minute: m.minute ?? null,
        injuryTime: m.injuryTime ?? null
      };
    });

    return Response.json(
      {
        matches,
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
        error: "No fue posible conectar con la API."
      },
      { status: 502 }
    );
  }
}
