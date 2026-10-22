export async function onRequestGet({request,env}) {
  const url=new URL(request.url);
  const teamId=url.searchParams.get("equipo");
  if(!/^\d+$/.test(teamId||""))return Response.json({error:"Identificador de equipo inválido."},{status:400});
  if(!env.FOOTBALL_API_KEY)return Response.json({error:"Falta FOOTBALL_API_KEY."},{status:500});
  const now=new Date();
  const start=now.toISOString().slice(0,10);
  const endDate=new Date(now);
  endDate.setUTCDate(endDate.getUTCDate()+91);
  const end=endDate.toISOString().slice(0,10);
  const params=new URLSearchParams({dateFrom:start,dateTo:end,limit:"100"});
  try {
    const res=await fetch(`https://api.football-data.org/v4/teams/${teamId}/matches?${params}`,{
      headers:{"X-Auth-Token":env.FOOTBALL_API_KEY,"Accept":"application/json"}
    });
    const data=await res.json();
    if(!res.ok)return Response.json({error:data.message||"No se pudieron consultar los próximos partidos."},{status:res.status});
    const matches=(Array.isArray(data.matches)?data.matches:[])
      .filter(m=>m.utcDate&&new Date(m.utcDate).getTime()>=Date.now()&&
        ["SCHEDULED","TIMED","IN_PLAY","PAUSED"].includes(m.status))
      .sort((a,b)=>new Date(a.utcDate)-new Date(b.utcDate))
      .slice(0,12).map(m=>({
        id:m.id,utcDate:m.utcDate,status:m.status,
        competition:m.competition?.name||"Competición",
        homeTeam:m.homeTeam?.name||m.homeTeam?.shortName||"Por definir",
        awayTeam:m.awayTeam?.name||m.awayTeam?.shortName||"Por definir"
      }));
    return Response.json({matches},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Error de conexión con football-data.org."},{status:502})}
}
