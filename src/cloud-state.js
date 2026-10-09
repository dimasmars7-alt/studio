const projectCollections=['posts','shoots','links','files','tasks','portfolio','finances'];

export function organizationSnapshot(state,organizationId){
 const org=state.orgs.find(item=>item.id===organizationId);
 if(!org)throw Error('Организация не найдена');
 const projectIds=new Set(state.projects.filter(item=>item.orgId===organizationId).map(item=>item.id));
 const snapshot=structuredClone(state);
 snapshot.orgs=[structuredClone(org)];
 snapshot.projects=snapshot.projects.filter(item=>projectIds.has(item.id));
 for(const key of projectCollections)snapshot[key]=snapshot[key].filter(item=>projectIds.has(item.projId));
 snapshot.gear=[];
 snapshot.profile={name:'',email:'',org:''};
 snapshot.planner=snapshot.planner||{version:1,topics:[],works:[],folders:[]};
 snapshot.planner.topics=snapshot.planner.topics.filter(item=>projectIds.has(item.projId));
 snapshot.planner.works=snapshot.planner.works.filter(item=>projectIds.has(item.projId));
 snapshot.planner.folders=(snapshot.planner.folders||[]).filter(item=>item.scope==='org'?item.ownerId===organizationId:projectIds.has(item.ownerId));
 return {format:'tarusov-planner-organization',schemaVersion:1,organizationId,exportedAt:new Date().toISOString(),state:snapshot};
}

export function mergeOrganizationSnapshot(local,envelope){
 if(envelope?.format!=='tarusov-planner-organization'||!envelope.organizationId||!envelope.state)throw Error('Некорректный облачный снимок');
 const remote=structuredClone(envelope.state),organizationId=envelope.organizationId;
 const currentProjectIds=new Set(local.projects.filter(item=>item.orgId===organizationId).map(item=>item.id));
 const next=structuredClone(local);
 next.orgs=[...next.orgs.filter(item=>item.id!==organizationId),...remote.orgs];
 next.projects=[...next.projects.filter(item=>!currentProjectIds.has(item.id)),...remote.projects];
 for(const key of projectCollections)next[key]=[...next[key].filter(item=>!currentProjectIds.has(item.projId)),...(remote[key]||[])];
 next.planner=next.planner||{version:1,topics:[],works:[],folders:[]};
 next.planner.topics=[...next.planner.topics.filter(item=>!currentProjectIds.has(item.projId)),...(remote.planner?.topics||[])];
 next.planner.works=[...next.planner.works.filter(item=>!currentProjectIds.has(item.projId)),...(remote.planner?.works||[])];
 next.planner.folders=[...(next.planner.folders||[]).filter(item=>item.scope==='org'?item.ownerId!==organizationId:!currentProjectIds.has(item.ownerId)),...(remote.planner?.folders||[])];
 for(const key of ['rubrics','socials','statuses','gearCats','portCats']){
  const byId=new Map(next[key].map(item=>[item.id,item]));
  for(const item of remote[key]||[])byId.set(item.id,item);
  next[key]=[...byId.values()];
 }
 return next;
}
