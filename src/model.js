export const collections=['orgs','projects','posts','shoots','tasks','gear','portfolio','links','files','finances','rubrics','socials','statuses','gearCats','portCats'];
export const uid=()=>crypto.randomUUID();
export const dateKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export function defaults(){return {
 version:2,orgs:[],projects:[],posts:[],shoots:[],tasks:[],gear:[],portfolio:[],links:[],files:[],finances:[],
 profile:{name:'Тарусов',email:'',org:''},
 settings:{theme:'light',accent:'#28745b',fontSize:15,navWidth:236},
 rubrics:[{id:'r1',name:'Новости',emoji:'📰',color:'#28745b'}],
 socials:[{id:'s1',name:'Instagram',emoji:'📷',color:'#b15c84'}],
 statuses:[{id:'st1',name:'Черновик',color:'#9b9b93'},{id:'st2',name:'Опубликован',color:'#28745b'}],
 gearCats:[{id:'g1',name:'Камеры',emoji:'📷'}],portCats:[{id:'p1',name:'Свадебные',emoji:'💒'}]
}}
export function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ожидается объект резервной копии');
 const base=defaults(), source=raw.data||raw;
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
 return base;
}
export function removeEntity(state,type,id){
 const next=structuredClone(state);
 const purgeProjects=ids=>{
 for(const k of ['posts','links','files'])next[k]=next[k].filter(x=>!ids.includes(x.projId));
 next.projects=next.projects.filter(x=>!ids.includes(x.id));
 };
 if(type==='orgs')purgeProjects(next.projects.filter(x=>x.orgId===id).map(x=>x.id));
 if(type==='projects')purgeProjects([id]);
 next[type]=next[type].filter(x=>x.id!==id);
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
