
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const competition =
    url.searchParams.get("competition") || "ALL";

  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta configurar FOOTBALL_API_KEY." },
      { status: 500 }
    );
  }

  const isValidDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      return false;
    }

    const date = new Date(value + "T00:00:00Z");

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  if (
    !isValidDate(dateFrom) ||
    !isValidDate(dateTo) ||
    dateFrom > dateTo
  ) {
    return Response.json(
      { error: "Las fechas seleccionadas no son válidas." },
      { status: 400 }
    );
  }

  // Ampliamos un día la consulta al proveedor.
  const extraDate = new Date(
    dateTo + "T00:00:00Z"
  );

  extraDate.setUTCDate(extraDate.getUTCDate() + 1);

  const extendedDateTo =
    extraDate.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dateFrom,
    dateTo: extendedDateTo
  });

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
          error:
            data.message ||
            "No se pudieron cargar los partidos."
        },
        { status: response.status }
      );
    }

    const matches = (data.matches || [])
      .filter(match => {
        if (!match.utcDate) {
          return false;
        }

        // Filtramos por la fecha UTC del partido.
        const matchDate =
          match.utcDate.slice(0, 10);

        return (
          matchDate >= dateFrom &&
          matchDate <= dateTo
        );
      })
      .map(match => ({
        id: match.id,
        utcDate: match.utcDate,
        status: match.status || "SCHEDULED",

        competition:
          match.competition?.name ||
          "Competición",

        homeTeam:
          match.homeTeam?.name ||
          match.homeTeam?.shortName ||
          "Por definir",

        awayTeam:
          match.awayTeam?.name ||
          match.awayTeam?.shortName ||
          "Por definir",

        homeScore:
          match.score?.fullTime?.home ??
          null,

        awayScore:
          match.score?.fullTime?.away ??
          null
      }));

    return Response.json(
      {
        matches,
        count: matches.length
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
