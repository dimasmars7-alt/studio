export const validColor=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
const palette=['#7561df','#168b78','#d47728','#c64f83','#397cc1','#889632','#a35ac7','#be5545','#259bab','#a57b30','#596bc4','#548044'];
export function nextProjectColor(projects){const used=new Set(projects.map(p=>(p.color||'').toLowerCase()));for(const c of palette)if(!used.has(c))return c;for(let i=0;i<10000;i++){const h=(i*137.508)%360,s=.55,l=.48,a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0');},c='#'+f(0)+f(8)+f(4);if(!used.has(c))return c;}return '#7561df';}
export function ensureProjectColors(s){for(const p of s.projects)if(!validColor(p.color))p.color=nextProjectColor(s.projects);return s;}
export const projectColor=(s,id)=>s.projects.find(p=>p.id===id)?.color||'#85889b';
export const projectName=(s,id)=>s.projects.find(p=>p.id===id)?.name||'Без проекта';
export function generalShoots(s){const topics=s.planner?.topics||[],linked=new Set(topics.flatMap(t=>t.scenes.filter(x=>x.date).map(x=>x.shootId)).filter(Boolean));return [...s.shoots.filter(x=>!linked.has(x.id)).map(x=>({...x,projId:x.projId||topics.find(t=>t.legacyShootId===x.id)?.projId||s.posts.find(p=>p.shootId===x.id)?.projId||''})),...topics.flatMap(t=>t.scenes.filter(x=>x.date).map(x=>({id:x.id,topicId:t.id,projId:t.projId,title:x.title,date:x.date,source:'planner',sceneId:x.id,time:'',place:'',desc:x.shots||''})))];}

