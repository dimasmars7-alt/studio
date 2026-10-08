import {ensureProjectColors} from './project-colors.js?v=20261008-single-plan8';
export const collections=['orgs','projects','posts','shoots','tasks','gear','portfolio','links','files','finances','rubrics','socials','statuses','gearCats','portCats'];
export const uid=()=>crypto.randomUUID();
export const dateKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function defaults(){return {
 version:2,orgs:[],projects:[],posts:[],shoots:[],tasks:[],gear:[],portfolio:[],links:[],files:[],finances:[],
 profile:{name:'Тарусов',email:'',org:''},
 settings:{theme:'light',accent:'#7561df',fontSize:15,navWidth:236},
 rubrics:[{id:'r1',name:'Новости',emoji:'📰',color:'#28745b'}],
 socials:[{id:'s1',name:'Instagram',emoji:'📷',color:'#b15c84'}],
 statuses:[{id:'st1',name:'Черновик',color:'#9b9b93'},{id:'st2',name:'Опубликован',color:'#28745b'}],
 gearCats:[{id:'g1',name:'Камеры',emoji:'📷'}],portCats:[{id:'p1',name:'Свадебные',emoji:'💒'}]
}}
export function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ожидается объект резервной копии');
 const base=defaults(), source=raw.data||raw;
 if(source.planner!==undefined){
 const p=source.planner;if(!p||typeof p!=='object'||Array.isArray(p)||!Array.isArray(p.topics)||!Array.isArray(p.works))throw Error('Некорректные данные нового плана');
 for(const key of ['topics','works']){const ids=new Set();for(const row of p[key]){if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.projId!=='string')throw Error('Некорректные ID в новом плане');ids.add(row.id);if(key==='topics'&&(!Array.isArray(row.scenes)||!Array.isArray(row.variants)||!Array.isArray(row.preparation)))throw Error('Некорректная тема в новом плане')}}
 for(const t of p.topics){
 if(typeof t.title!=='string'||!t.title.trim()||!Array.isArray(t.workIds)||t.workIds.some(x=>typeof x!=='string'))throw Error('Некорректная тема нового плана');
 if(t.folderIds!==undefined&&(!Array.isArray(t.folderIds)||t.folderIds.some(x=>typeof x!=='string')))throw Error('Некорректные связи папок');
 for(const name of ['script','day','rubric','approval','approvalNote'])if(t[name]!==undefined&&typeof t[name]!=='string')throw Error('Некорректное поле темы: '+name);
 if(t.answers!==undefined&&(!t.answers||typeof t.answers!=='object'||Array.isArray(t.answers)||Object.values(t.answers).some(x=>typeof x!=='string')))throw Error('Некорректные ответы мастера');
 for(const key of ['scenes','variants','preparation']){const ids=new Set();for(const row of t[key]){if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id))throw Error('Некорректные ID внутри темы');ids.add(row.id);for(const name of ['title','shots','plan','audio','stage','status','beforeNote','text','platform','format','date','deadline','ready','link'])if(row[name]!==undefined&&typeof row[name]!=='string')throw Error('Некорректное поле внутри темы');if(key==='scenes'&&(!Array.isArray(row.workIds)||typeof row.title!=='string'))throw Error('Некорректная сцена');}}
 }
 for(const w of p.works)if(typeof w.name!=='string'||!w.name.trim())throw Error('Некорректная работа проекта');
 base.planner=structuredClone(p);
 if(p.folders!==undefined){if(!Array.isArray(p.folders))throw Error('Некорректные папки');const ids=new Set();for(const f of p.folders){if(!f||typeof f.id!=='string'||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||!['project','org'].includes(f.scope)||typeof f.ownerId!=='string')throw Error('Некорректная папка');ids.add(f.id);}}
 }
 // Старые резервные копии могли содержать отдельный раздел ideas. В новом плане
 // идея является обычной темой, поэтому переносим записи с теми же ID один раз.
 if(Array.isArray(source.ideas)){
  base.planner=base.planner||{version:1,topics:[],works:[],folders:[]};
  const existing=new Set(base.planner.topics.map(t=>t.id));
  for(const idea of source.ideas){
   if(!idea||typeof idea!=='object')continue;
   const projId=String(idea.projId||idea.projectId||'');
   const title=String(idea.title||idea.name||idea.topic||'').trim();
   if(!idea.id||!projId||!title||existing.has(String(idea.id)))continue;
   const topic={...structuredClone(idea),id:String(idea.id),projId,title,script:String(idea.script||idea.text||idea.note||''),rubric:String(idea.rubric||''),day:String(idea.day||idea.date||''),workIds:Array.isArray(idea.workIds)?idea.workIds.map(String):[],scenes:Array.isArray(idea.scenes)?structuredClone(idea.scenes):[],variants:Array.isArray(idea.variants)?structuredClone(idea.variants):[],preparation:Array.isArray(idea.preparation)?structuredClone(idea.preparation):[],approval:String(idea.approval||'Не отправлено'),answers:idea.answers&&typeof idea.answers==='object'?structuredClone(idea.answers):{},legacyShootId:String(idea.legacyShootId||idea.shootId||'')};
   base.planner.topics.push(topic);existing.add(topic.id);
  }
 }
 if(!collections.some(k=>Array.isArray(source[k])))throw Error('Файл не содержит данных студии');
 for(const k of collections){
 if(source[k]!==undefined&&!Array.isArray(source[k]))throw Error('Некорректный раздел: '+k);
 base[k]=(source[k]||base[k]).map(row=>{
 if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Некорректная запись: '+k);
 return {...row,id:String(row.id||uid())};
 });
 const ids=base[k].map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error('Повторяющиеся ID: '+k);
 }
 const stringFields=['name','title','text','desc','emoji','color','date','time','place','url','link','type','data','priority','orgId','projId','catId','social','rubric','status'];
 for(const key of collections)for(const row of base[key]){
 for(const field of stringFields)if(row[field]!==undefined&&typeof row[field]!=='string')throw Error('Некорректное поле '+field+' в разделе '+key);
 const label=({shoots:'title',posts:'title',tasks:'text',finances:'desc'}[key]||'name');
 if(key!=='finances'&&!(row[label]||'').trim())throw Error('Отсутствует '+label+' в разделе '+key);
 if(row.date&&!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw Error('Некорректная дата в разделе '+key);
 if(key==='tasks')row.done=Boolean(row.done);
 if(key==='projects')row.archived=Boolean(row.archived);
 }
 base.profile={...base.profile,...source.profile};
 for(const key of ['name','email','org'])if(typeof base.profile[key]!=='string')throw Error('Некорректный профиль');
 base.settings={...base.settings,...source.settings};
 if(!/^#[0-9a-f]{6}$/i.test(base.settings.accent))base.settings.accent='#28745b';
 base.settings.fontSize=Math.min(19,Math.max(13,Number(base.settings.fontSize)||15));
 base.settings.navWidth=Math.min(280,Math.max(200,Number(base.settings.navWidth)||236));
 base.settings.theme=base.settings.theme==='dark'?'dark':'light';
 for(const g of base.gear){g.qty=Math.max(1,Number(g.qty)||1);g.price=Math.max(0,Number(g.price)||0)}
 for(const f of base.finances)f.amount=Math.max(0,Number(f.amount)||0);
 ensureProjectColors(base);
 return base;
}
export function removeEntity(state,type,id){
 const next=structuredClone(state);
 const purgeProjects=ids=>{
 for(const k of ['posts','links','files'])next[k]=next[k].filter(x=>!ids.includes(x.projId));
 next.projects=next.projects.filter(x=>!ids.includes(x.id));
 if(next.planner){next.planner.topics=next.planner.topics.filter(x=>!ids.includes(x.projId));next.planner.works=next.planner.works.filter(x=>!ids.includes(x.projId));}
 if(next.planner?.folders)next.planner.folders=next.planner.folders.filter(f=>!(f.scope==='project'&&ids.includes(f.ownerId)));
 };
 if(type==='orgs')purgeProjects(next.projects.filter(x=>x.orgId===id).map(x=>x.id));
 if(type==='orgs'&&next.planner?.folders)next.planner.folders=next.planner.folders.filter(f=>!(f.scope==='org'&&f.ownerId===id));
 if(type==='projects')purgeProjects([id]);
 next[type]=next[type].filter(x=>x.id!==id);
 if(type==='posts'&&next.planner)next.planner.topics.forEach(t=>{t.variants=t.variants.filter(v=>v.legacyPostId!==id)});
 const ref={rubrics:['posts','rubric'],socials:['posts','social'],statuses:['posts','status'],gearCats:['gear','catId'],portCats:['portfolio','catId']}[type];
 if(ref)next[ref[0]].forEach(x=>{if(x[ref[1]]===id)x[ref[1]]=''});
 return next;
}
export function diagnose(s){
 const problems=[];
 for(const p of s.projects)if(!s.orgs.some(o=>o.id===p.orgId))problems.push('Проект без организации: '+p.name);
 for(const key of ['posts','files','links'])for(const row of s[key])if(!s.projects.some(p=>p.id===row.projId))problems.push('Запись без проекта: '+(row.title||row.name));
 return problems;
}
export function repair(s){
 const next=normalize(s);
 next.projects=next.projects.filter(p=>next.orgs.some(o=>o.id===p.orgId));
 for(const k of ['posts','links','files'])next[k]=next[k].filter(x=>next.projects.some(p=>p.id===x.projId));
 const initial=defaults();for(const k of ['rubrics','socials','statuses','gearCats','portCats'])if(!next[k].length)next[k]=initial[k];
 for(const [field,list] of [['rubric','rubrics'],['social','socials'],['status','statuses']])next.posts.forEach(p=>{if(!next[list].some(x=>x.id===p[field]))p[field]=''});
 for(const [items,cats] of [['gear','gearCats'],['portfolio','portCats']])next[items].forEach(p=>{if(!next[cats].some(x=>x.id===p.catId))p.catId=''});
 return next;
}
