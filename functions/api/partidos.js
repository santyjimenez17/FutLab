
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const competition = url.searchParams.get("competition") || "ALL";

  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "FOOTBALL_API_KEY no está configurada." },
      { status: 500 }
    );
  }

  // Validar fechas antes de consultar.
  const validDate = value =>
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z"));

  if (
    !validDate(dateFrom) ||
    !validDate(dateTo) ||
    dateFrom > dateTo
  ) {
    return Response.json(
      { error: "Intervalo de fechas inválido." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    dateFrom,
    dateTo
  });

  if (competition !== "ALL") {
    params.set("competitions", competition);
  }

  const endpoint =
    "https://api.football-data.org/v4/matches?" +
    params.toString();

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        "X-Auth-Token": env.FOOTBALL_API_KEY,
        "Accept": "application/json"
      },
      cf: {
        cacheTtl: 0
      }
    });

    let data;

    try {
      data = await upstream.json();
    } catch {
      return Response.json(
        { error: "La API devolvió una respuesta inválida." },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return Response.json(
        {
          error: data.message ||
            "Error al consultar football-data.org.",
          providerStatus: upstream.status
        },
        { status: upstream.status }
      );
    }

    const originalMatches = Array.isArray(data.matches)
      ? data.matches
      : [];

    const matches = originalMatches.map(match => {
      const home = match.homeTeam || {};
      const away = match.awayTeam || {};
      const score = match.score || {};

      return {
        id: match.id,
        utcDate: match.utcDate,
        status: match.status || "SCHEDULED",

        competition:
          match.competition?.name ||
          match.competition?.code ||
          "Competición",

        homeTeam:
          home.name ||
          home.shortName ||
          home.tla ||
          "Local por definir",

        awayTeam:
          away.name ||
          away.shortName ||
          away.tla ||
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
        updatedAt: new Date().toISOString(),
        diagnostic: {
          requestedFrom: dateFrom,
          requestedTo: dateTo,
          competition,
          providerCount: originalMatches.length,
          message: matches.length
            ? "Partidos recibidos correctamente."
            : "El proveedor no devolvió partidos para estos filtros."
        }
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
        error: "No se pudo conectar con football-data.org."
      },
      { status: 502 }
    );
  }
}
