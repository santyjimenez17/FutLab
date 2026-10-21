
const LIGAS = new Set([
  "ALL", "PL", "PD", "BL1", "SA",
  "FL1", "CL", "DED", "PPL", "BSA", "ELC"
]);

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(fecha + "T00:00:00Z");
  return !isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === fecha;
}

export async function onRequestGet({ request, env }) {
  if (!env.FOOTBALL_API_KEY) {
    return Response.json(
      { error: "Falta FOOTBALL_API_KEY en Cloudflare." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const hoy = new Date().toISOString().slice(0, 10);

  const dateFrom = url.searchParams.get("dateFrom") || hoy;
  const dateTo = url.searchParams.get("dateTo") || dateFrom;
  const competition = (
    url.searchParams.get("competition") || "ALL"
  ).toUpperCase();

  if (!fechaValida(dateFrom) || !fechaValida(dateTo)) {
    return Response.json(
      { error: "Las fechas deben tener formato AAAA-MM-DD." },
      { status: 400 }
    );
  }

  const inicio = Date.parse(dateFrom + "T00:00:00Z");
  const fin = Date.parse(dateTo + "T00:00:00Z");
  const dias = (fin - inicio) / 86400000;

  if (dias < 0 || dias > 14) {
    return Response.json(
      { error: "Selecciona un intervalo de 1 a 15 días." },
      { status: 400 }
    );
  }

  if (!LIGAS.has(competition)) {
    return Response.json(
      { error: "Competición no admitida." },
      { status: 400 }
    );
  }

  const api = new URL(
    "https://api.football-data.org/v4/matches"
  );

  api.searchParams.set("dateFrom", dateFrom);

  // El límite superior de la API es exclusivo.
  const siguiente = new Date(fin + 86400000);
  api.searchParams.set(
    "dateTo",
    siguiente.toISOString().slice(0, 10)
  );

  if (competition !== "ALL") {
    api.searchParams.set("competitions", competition);
  }

  try {
    const respuesta = await fetch(api.toString(), {
      headers: {
        "X-Auth-Token": env.FOOTBALL_API_KEY
      },
      cf: {
        cacheTtl: 120,
        cacheEverything: true
      }
    });

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

    const matches = (datos.matches || []).map(p => ({
      id: p.id,
      competition: p.competition?.name ?? "",
      utcDate: p.utcDate,
      status: p.status,
      homeTeam: p.homeTeam?.name ?? "Por definir",
      awayTeam: p.awayTeam?.name ?? "Por definir",
      homeScore: p.score?.fullTime?.home ?? null,
      awayScore: p.score?.fullTime?.away ?? null
    }));

    return Response.json({
      source: "football-data.org",
      dateFrom,
      dateTo,
      competition,
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
