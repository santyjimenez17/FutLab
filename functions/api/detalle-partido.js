export async function onRequestGet({request,env}) {
  const id=new URL(request.url).searchParams.get("id");
  if(!/^\d+$/.test(id||""))return Response.json({error:"Identificador de partido inválido."},{status:400});
  if(!env.FOOTBALL_API_KEY)return Response.json({error:"Falta FOOTBALL_API_KEY."},{status:500});
  try {
    const res=await fetch(`https://api.football-data.org/v4/matches/${id}`,{
      headers:{"X-Auth-Token":env.FOOTBALL_API_KEY,"Accept":"application/json"}
    });
    const data=await res.json();
    if(!res.ok)return Response.json({error:data.message||"Detalle no disponible."},{status:res.status});
    // football-data.org normalmente no entrega alineaciones: no inferir ni inventar.
    const clean=players=>Array.isArray(players)?players
      .map(p=>typeof p?.name==="string"?p.name:null).filter(Boolean):[];
    return Response.json({
      id:data.id,status:data.status,
      lineups:{
        home:clean(data.homeTeam?.lineup),
        away:clean(data.awayTeam?.lineup)
      }
    },{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Error de conexión con football-data.org."},{status:502})}
}
