import {uid,normalize} from './model.js?v=20261012-cloud1';

const key=value=>String(value||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,'');
const sameWork=(existing,incoming)=>{
 const title=key(existing.name),full=key(existing.description),incomingTitle=key(incoming.name),incomingFull=key(incoming.description);
 return title===incomingTitle||title===incomingFull||full===incomingFull||(title.length>35&&incomingFull.includes(title));
};
const fields=(record,names)=>Object.fromEntries(names.filter(name=>record[name]!==undefined).map(name=>[name,record[name]]));

export function readProjectPackage(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(!data||data.type!=='tarusov-project-package'||data.version!==1||!Array.isArray(data.projects)||!data.projects.length||data.projects.length>50||!String(data.organization||'').trim())throw Error('Это не пакет проектов Тарусов Planner');
 for(const group of data.projects){
  if(!group?.project?.name?.trim()||!Array.isArray(group.works)||!Array.isArray(group.topics)||!Array.isArray(group.links||[]))throw Error('В пакете есть неполный проект');
  if(group.works.some(work=>!work.id||!work.name?.trim())||group.topics.some(topic=>!topic.id||!topic.title?.trim()||!Array.isArray(topic.scenes)||!Array.isArray(topic.variants)||!Array.isArray(topic.preparation)||!Array.isArray(topic.workIds)))throw Error('Некорректные работы или темы проекта');
 }
 return data;
}

export function mergeProjectPackage(input,raw){
 const data=readProjectPackage(raw),state=structuredClone(input);state.planner=state.planner||{version:2,topics:[],works:[],folders:[]};state.planner.folders=state.planner.folders||[];
 let org=state.orgs.find(x=>key(x.name)===key(data.organization));if(!org){org={id:uid(),name:data.organization.trim()};state.orgs.push(org);}
 const summary={projects:0,works:0,topics:0,scenes:0,variants:0,existing:0,firstProjectId:''};
 for(const group of data.projects){
  const source=group.project;
  let project=state.projects.find(x=>x.orgId===org.id&&(key(x.name)===key(source.name)||(key(source.name).length>5&&key(x.name).includes(key(source.name)))));
  if(project){summary.existing++;if(!project.description&&source.description)project.description=source.description;if(!project.phase&&source.phase)project.phase=source.phase;}
  else{project={...structuredClone(source),id:uid(),orgId:org.id,archived:false};state.projects.push(project);summary.projects++;}
  summary.firstProjectId||=project.id;
  const projectWorks=state.planner.works.filter(x=>x.projId===project.id),workIds=new Map();
  for(const sourceWork of group.works){
   let current=projectWorks.find(x=>sameWork(x,sourceWork));
   if(!current){current={...structuredClone(sourceWork),id:uid(),projId:project.id};state.planner.works.push(current);projectWorks.push(current);summary.works++;}
   workIds.set(sourceWork.id,current.id);
  }
  const projectTopics=state.planner.topics.filter(x=>x.projId===project.id);
  for(const sourceTopic of group.topics){
   const mappedWorkIds=sourceTopic.workIds.map(id=>workIds.get(id)).filter(Boolean);
   let topic=projectTopics.find(x=>key(x.title)===key(sourceTopic.title));
   if(!topic){
    topic={...structuredClone(sourceTopic),id:uid(),projId:project.id,workIds:mappedWorkIds,scenes:[],variants:[],preparation:[]};
    state.planner.topics.push(topic);projectTopics.push(topic);summary.topics++;
   }else{
    topic.workIds=[...new Set([...(topic.workIds||[]),...mappedWorkIds])];
    if(!topic.script&&sourceTopic.script)topic.script=sourceTopic.script;
    if(!topic.teamNote&&sourceTopic.teamNote)topic.teamNote=sourceTopic.teamNote;
    if(!topic.contentGoal&&sourceTopic.contentGoal)topic.contentGoal=sourceTopic.contentGoal;
   }
   topic.scenes=topic.scenes||[];topic.variants=topic.variants||[];topic.preparation=topic.preparation||[];
   for(const sourceScene of sourceTopic.scenes){
    if(topic.scenes.some(x=>key(x.title)===key(sourceScene.title)))continue;
    topic.scenes.push({...structuredClone(sourceScene),id:uid(),workIds:(sourceScene.workIds||[]).map(id=>workIds.get(id)).filter(Boolean)});summary.scenes++;
   }
   for(const sourceVariant of sourceTopic.variants){
    if(topic.variants.some(x=>key(x.platform)===key(sourceVariant.platform)&&key(x.format)===key(sourceVariant.format)))continue;
    topic.variants.push({...structuredClone(sourceVariant),id:uid(),legacyPostId:''});summary.variants++;
   }
   for(const sourceStep of sourceTopic.preparation){
    if(topic.preparation.some(x=>key(x.text)===key(sourceStep.text)))continue;
    topic.preparation.push({...structuredClone(sourceStep),id:uid()});
   }
  }
  for(const sourceLink of group.links||[]){
   if(state.links.some(x=>x.projId===project.id&&x.url===sourceLink.url))continue;
   state.links.push({...fields(sourceLink,['name','url']),id:uid(),projId:project.id});
  }
 }
 return {state:normalize(state),summary};
}
