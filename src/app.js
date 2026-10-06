import {defaults,uid,dateKey,normalize,removeEntity,diagnose,repair} from './model.js';
import {openStore,persist} from './storage.js';
import {escape as e,field,openDialog,toast,safeUrl,button as b,empty} from './ui.js';
import * as views from './views.js';
let state,busy=false;
const ui={section:views.sections.some(x=>x[0]===location.hash.slice(1))?location.hash.slice(1):'home',date:dateKey(),postDate:dateKey(),calMode:'month',orgId:'',projId:'',postTab:'cal',archive:false,taskFilter:'all',query:'',postStatus:'',portCat:''};
const $=s=>document.querySelector(s);
const titles={shoots:'Съёмка',orgs:'Организация',projects:'Проект',posts:'Материал',tasks:'Задача',gear:'Снаряжение',portfolio:'Работа в портфолио',links:'Ссылка',finances:'Финансовая операция',rubrics:'Рубрика',socials:'Соцсеть',statuses:'Статус',gearCats:'Категория снаряжения',portCats:'Категория портфолио'};
function applyAppearance(){
 document.documentElement.dataset.theme=state.settings.theme;
 for(const [key,value] of Object.entries({'--accent':state.settings.accent,'--font':state.settings.fontSize+'px','--sidebar':state.settings.navWidth+'px'}))document.documentElement.style.setProperty(key,value);
}
function render(){
 applyAppearance();
 const renderers={home:views.home,cal:views.calendar,content:views.content,tasks:views.tasks,gear:views.gear,portfolio:views.portfolio,account:views.account,settings:views.settings};
 $('#app').innerHTML=views.shell(state,ui,renderers[ui.section](state,ui));
}
async function commit(next,message='Сохранено'){
 if(busy)throw Error('Дождитесь сохранения текущего изменения');
 busy=true;try{await persist(next);state=next;render();if(message)toast(message)}finally{busy=false}
}
function navigate(section){
 ui.section=section;ui.query='';location.hash=section;render();
}
const choices=(key)=>[['','Не выбрано'],...state[key].map(x=>[x.id,(x.emoji||'')+' '+x.name])];
function entityForm(type,id=null,date=null){
 const existing=id?state[type].find(x=>x.id===id):null;
 if(id&&!existing)throw Error('Запись не найдена');
 if(type==='projects'&&!ui.orgId)throw Error('Сначала выберите организацию');
 if(['posts','links'].includes(type)&&!state.projects.some(x=>x.id===ui.projId))throw Error('Сначала выберите проект');
 const x=existing||{},f=(name,label,value='',kind='text',options=null,required=false)=>field(name,label,x[name]??value,kind,options,required);
 let html='';
 if(type==='shoots')html=f('title','Название','','text',null,true)+'<div class="form-grid">'+f('date','Дата',date||ui.date,'date',null,true)+f('time','Время','','time')+'</div>'+f('place','Место')+f('desc','Описание','','textarea');
 else if(['orgs','projects'].includes(type))html=f('name','Название','','text',null,true)+f('emoji','Эмодзи','📁');
 else if(type==='posts')html=f('title','Заголовок','','text',null,true)+'<div class="form-grid">'+f('date','Дата публикации',date||dateKey(),'date',null,true)+f('social','Соцсеть','','text',choices('socials'))+f('rubric','Рубрика','','text',choices('rubrics'))+f('status','Статус',state.statuses[0]?.id||'','text',choices('statuses'))+'</div>'+f('link','Ссылка','','url')+f('text','Текст публикации','','textarea');
 else if(type==='tasks')html=f('text','Задача','','text',null,true)+'<div class="form-grid">'+f('priority','Приоритет','medium','text',[['low','Низкий'],['medium','Средний'],['high','Высокий']])+f('date','Срок','','date')+'</div>';
 else if(type==='gear')html=f('name','Название','','text',null,true)+f('catId','Категория','','text',choices('gearCats'))+'<div class="form-grid">'+f('qty','Количество',1,'number',null,true)+f('price','Цена за единицу, ₽',0,'number',null,true)+'</div>';
 else if(type==='portfolio')html=f('name','Название работы','','text',null,true)+f('catId','Категория','','text',choices('portCats'))+f('link','Ссылка на работу','','url');
 else if(type==='links')html=f('name','Название','','text',null,true)+f('url','URL','','url',null,true);
 else if(type==='finances')html=f('desc','Описание','','text',null,true)+'<div class="form-grid">'+f('type','Тип','income','text',[['income','Доход'],['expense','Расход']])+f('amount','Сумма, ₽','','number',null,true)+'</div>'+f('date','Дата',dateKey(),'date',null,true);
 else html=f('name','Название','','text',null,true)+(type!=='statuses'?f('emoji','Эмодзи','🏷️'):'')+(['rubrics','socials','statuses'].includes(type)?f('color','Цвет','#28745b','color'):'');
 openDialog((id?'Изменить: ':'Добавить: ')+titles[type],html,async data=>{
 for(const key of Object.keys(data))if(typeof data[key]==='string')data[key]=data[key].trim();
 for(const key of ['url','link'])if(data[key]&&!safeUrl(data[key]))throw Error('Используйте ссылку с http:// или https://');
 for(const key of ['title','name','text','desc'])if(key in data&&!data[key]&&['title','name'].includes(key))throw Error('Заполните название');
 if(type==='tasks'&&!data.text)throw Error('Введите текст задачи');
 if(type==='gear'){data.qty=Number(data.qty);data.price=Number(data.price);if(!Number.isInteger(data.qty)||data.qty<1||!Number.isFinite(data.price)||data.price<0)throw Error('Количество должно быть целым и положительным; цена — неотрицательной')}
 if(type==='finances'){data.amount=Number(data.amount);if(!Number.isFinite(data.amount)||data.amount<=0)throw Error('Введите сумму больше нуля')}
 const record={...existing,...data,id:id||uid()};
 if(type==='projects'){record.orgId=existing?.orgId||ui.orgId;record.archived=Boolean(existing?.archived)}
 if(['posts','links'].includes(type))record.projId=existing?.projId||ui.projId;
 if(type==='tasks')record.done=Boolean(existing?.done);
 const next=structuredClone(state);if(id)next[type]=next[type].map(v=>v.id===id?record:v);else next[type].push(record);
 await commit(next);
 if(type==='orgs'&&!id){ui.orgId=record.id;ui.projId='';ui.section='content';location.hash='content';render()}
 if(type==='projects'&&!id){ui.projId=record.id;ui.archive=false;render()}
 });
}
function confirmDialog(title,text,callback){
 openDialog(title,'<p>'+e(text)+'</p>',callback);
 $('#modal button[type=submit]').textContent='Подтвердить';
}
function shiftDate(key,direction,mode){
 const d=new Date(ui[key]+'T12:00:00');
 if(mode==='day')d.setDate(d.getDate()+direction);
 else if(mode==='week')d.setDate(d.getDate()+7*direction);
 else if(mode==='month'){d.setDate(1);d.setMonth(d.getMonth()+direction)}
 else d.setFullYear(d.getFullYear()+direction*(mode==='decade'?10:1));
 ui[key]=dateKey(d);render();
}
function appearance(){
 const s=state.settings;
 openDialog('Оформление',field('theme','Тема',s.theme,'text',[['light','Светлая'],['dark','Тёмная']])+field('accent','Цвет акцента',s.accent,'color')+field('fontSize','Размер текста',s.fontSize,'text',[[13,'Компактный'],[15,'Обычный'],[17,'Крупный'],[19,'Очень крупный']])+field('navWidth','Ширина меню',s.navWidth,'text',[[200,'Узкое'],[236,'Обычное'],[280,'Широкое']]),async data=>{const next=structuredClone(state);next.settings={...data,fontSize:Number(data.fontSize),navWidth:Number(data.navWidth)};await commit(next)});
}
async function exportBackup(){
 const json=JSON.stringify({version:2,exportedAt:new Date().toISOString(),data:state},null,2);
 download(new Blob([json],{type:'application/json'}),'studio-backup-'+dateKey()+'.json');toast('Резервная копия скачана');
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function viewFile(id){
 const x=state.files.find(v=>v.id===id);if(!x)return;
 const isData=typeof x.data==='string'&&/^data:[^,]*;base64,/.test(x.data);
 if(!isData)throw Error('Файл повреждён');
 let content;
 if(/^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(x.type))content='<img class="preview" src="'+e(x.data)+'" alt="'+e(x.name)+'">';
 else if(x.type?.startsWith('video/'))content='<video class="preview" src="'+e(x.data)+'" controls></video>';
 else if(x.type?.startsWith('audio/'))content='<audio class="preview" src="'+e(x.data)+'" controls></audio>';
 else if(x.type==='application/pdf')content='<iframe class="file-preview" sandbox src="'+e(x.data)+'" title="Просмотр PDF"></iframe>';
 else content='<p>Для этого формата доступно скачивание.</p>';
 openDialog(x.name,content+'<div class="toolbar" style="margin-top:20px">'+b('download-file','↓ Скачать файл','data-id="'+e(id)+'"')+'</div>',null,true);
}
let chat=[];
function assistant(){
 openDialog('Помощник студии','<div class="notice">Локальный помощник по командам. Например: «раздел календарь», «тёмная тема», «цвет #28745b», «проверить», «экспорт».</div><div class="assistant-log" id="assistant-log">'+chat.map(m=>'<div class="message '+(m.user?'user-message':'')+'">'+e(m.text)+'</div>').join('')+'</div>'+field('command','Ваша команда','','text',null,true),async data=>{
 const q=data.command.trim().toLowerCase();let response='Не понял команду. Попробуйте: раздел задачи, светлая тема, тёмная тема, цвет #28745b, проверить, восстановить, экспорт.';
 if(q.includes('темная')||q.includes('тёмная')||q.includes('светлая')){
 const next=structuredClone(state);next.settings.theme=q.includes('светлая')?'light':'dark';await commit(next);response='Тема изменена.';
 }else if(q.includes('цвет')){
 const color=q.match(/#[0-9a-f]{6}\b/i)?.[0];if(color){const next=structuredClone(state);next.settings.accent=color;await commit(next);response='Цвет обновлён.'}else response='Укажите цвет в формате #28745b.';
 }else if(q.includes('экспорт')){await exportBackup();response='Копия данных скачана.'}
 else if(q.includes('восстанов')){await commit(repair(state));response='Связи восстановлены.'}
 else if(q.includes('провер')||q.includes('диагност')){const errors=diagnose(state);response=errors.length?errors.join('\n'):'Проверка завершена: связи данных в порядке.'}
 else if(q.includes('раздел')){
 const match=[['глав','home'],['обзор','home'],['календар','cal'],['контент','content'],['задач','tasks'],['снаряж','gear'],['портфол','portfolio'],['аккаун','account'],['профил','account'],['финанс','account'],['настрой','settings']].find(([word])=>q.includes(word));
 if(match){navigate(match[1]);response='Раздел открыт.'}
 }
 chat.push({user:true,text:data.command},{user:false,text:response});chat=chat.slice(-30);
 setTimeout(assistant,0);
 });
 $('#modal button[type=submit]').textContent='Отправить';
}
document.addEventListener('click',async event=>{
 const btn=event.target.closest('[data-action]');if(!btn||!state)return;
 const {action,type,id,section,date,tab,filter,year}=btn.dataset;
 try{
 if(action==='emoji'){const input=btn.closest('form')?.querySelector('[name=emoji]');if(input)input.value=btn.dataset.emoji}
 else if(action==='navigate')navigate(section);
 else if(action==='menu')$('#sidebar').classList.toggle('open');
 else if(action==='add')entityForm(type,null,date);
 else if(action==='edit')entityForm(type,id);
 else if(action==='delete'){
 const text=['orgs','projects'].includes(type)?'Запись и все связанные проекты, посты, ссылки и файлы будут удалены. Продолжить?':'Удалить эту запись?';
 confirmDialog('Удаление',text,async()=>{await commit(removeEntity(state,type,id),'Запись удалена');if(type==='orgs'&&ui.orgId===id){ui.orgId='';ui.projId=''}if(type==='projects'&&ui.projId===id)ui.projId='';render()});
 }else if(action==='day'){ui.date=date;openDialog('Съёмки · '+date,views.shootList(state.shoots.filter(x=>x.date===date))+'<div style="margin-top:16px">'+b('add','＋ Съёмка','data-type="shoots" data-date="'+date+'"','primary')+'</div>',null,true)}
 else if(action==='calendar-date'){ui.date=date;ui.calMode='month';navigate('cal')}
 else if(action==='calendar-year'){ui.date=year+'-01-01';ui.calMode='year';render()}
 else if(action==='cal-prev'||action==='cal-next')shiftDate('date',action==='cal-prev'?-1:1,ui.calMode);
 else if(action==='cal-today'){ui.date=dateKey();render()}
 else if(action==='post-prev'||action==='post-next')shiftDate('postDate',action==='post-prev'?-1:1,'month');
 else if(action==='post-today'){ui.postDate=dateKey();render()}
 else if(action==='post-day'){
 const rows=state.posts.filter(x=>x.projId===ui.projId&&x.date===date);
 openDialog('Публикации · '+date,(rows.length?rows.map(x=>'<div class="list-row"><strong>'+e(x.title)+'</strong>'+b('edit','Изменить','data-type="posts" data-id="'+e(x.id)+'"')+'</div>').join(''):empty('Нет публикаций'))+b('add','＋ Пост','data-type="posts" data-date="'+date+'"','primary'),null);
 }else if(action==='post-tab'){ui.postTab=tab;render()}
 else if(action==='task-filter'){ui.taskFilter=filter;render()}
 else if(action==='toggle-archive'){ui.archive=!ui.archive;ui.projId='';render()}
 else if(action==='archive'){const next=structuredClone(state);next.projects.find(x=>x.id===id).archived=!ui.archive;await commit(next,'Проект перемещён');ui.projId='';render()}
 else if(action==='appearance')appearance();
 else if(action==='profile')openDialog('Профиль студии',field('name','Имя',state.profile.name,'text',null,true)+field('email','Email',state.profile.email,'email')+field('org','Название студии',state.profile.org),async data=>{const next=structuredClone(state);next.profile=data;await commit(next)});
 else if(action==='export')await exportBackup();
 else if(action==='diagnose'){const errors=diagnose(state);openDialog('Диагностика','<div class="notice">'+(errors.length?errors.map(e).join('<br>'):'Связи данных в порядке.')+'</div><p>Всего записей: '+Object.values(state).filter(Array.isArray).reduce((sum,list)=>sum+list.length,0)+'. Хранилище: IndexedDB.</p>')}
 else if(action==='repair')confirmDialog('Восстановление','Удалить записи без родительского проекта или организации и восстановить справочники? Перед восстановлением рекомендуем экспортировать данные.',()=>commit(repair(state),'Связи восстановлены'));
 else if(action==='reset')confirmDialog('Очистка данных','Все данные новой версии на этом устройстве будут удалены. Скачайте резервную копию перед очисткой.',async()=>{await commit(defaults(),'Данные очищены');ui.orgId='';ui.projId='';render()});
 else if(action==='view-file')await viewFile(id);
 else if(action==='download-file'){const x=state.files.find(v=>v.id===id);if(x&&/^data:[^,]*;base64,/.test(x.data)){const raw=atob(x.data.split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));download(new Blob([bytes],{type:x.type||'application/octet-stream'}),x.name)}}
 else if(action==='assistant')assistant();
 }catch(err){toast(err.message)}
});
document.addEventListener('change',async event=>{
 const target=event.target;
 try{
 if(target.dataset.control){const key=target.dataset.control;ui[key]=target.value;if(key==='orgId'){ui.projId='';ui.archive=false}render()}
 if(target.dataset.toggleTask){const next=structuredClone(state),task=next.tasks.find(x=>x.id===target.dataset.toggleTask);if(task){task.done=target.checked;await commit(next,task.done?'Задача выполнена':'Задача возвращена в работу')}}
 if(target.id==='import-data'){
 const file=target.files[0];if(!file)return;
 if(file.size>150*1024*1024)throw Error('Копия слишком большая: максимум 150 МБ');
 const imported=normalize(JSON.parse(await file.text()));
 confirmDialog('Импорт данных','Текущие данные будут заменены содержимым файла «'+file.name+'». Продолжить?',async()=>{await commit(imported,'Данные импортированы');ui.orgId='';ui.projId='';render()});
 }
 if(target.id==='upload-files'){
 const projId=ui.projId;if(!state.projects.some(x=>x.id===projId))throw Error('Выберите проект');
 const files=Array.from(target.files);if(files.some(x=>x.size>20*1024*1024))throw Error('Один из файлов превышает 20 МБ');
 const records=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({id:uid(),projId,name:file.name,type:file.type,size:file.size,data:reader.result});reader.onerror=()=>reject(Error('Не удалось прочитать '+file.name));reader.readAsDataURL(file)})));
 if(!state.projects.some(x=>x.id===projId))throw Error('Проект уже удалён');
 const next=structuredClone(state);next.files.push(...records);await commit(next,'Загружено файлов: '+records.length);
 }
 }catch(err){toast(err.message);render()}
});
let searchTimer;
document.addEventListener('input',event=>{
 if(event.target.dataset.control!=='query')return;
 const value=event.target.value,position=event.target.selectionStart;
 clearTimeout(searchTimer);searchTimer=setTimeout(()=>{ui.query=value;render();const input=$('[data-control=query]');input?.focus();input?.setSelectionRange(position,position)},180);
});
window.addEventListener('hashchange',()=>{const section=location.hash.slice(1);if(state&&views.sections.some(x=>x[0]===section)&&ui.section!==section){ui.section=section;ui.query='';render()}});
async function init(){
 try{
 const result=await openStore();state=result.state;
 if(state.orgs.length){ui.orgId=state.orgs[0].id;ui.projId=state.projects.find(x=>x.orgId===ui.orgId&&!x.archived)?.id||''}
 render();if(result.migrated)toast('Данные предыдущей версии перенесены');
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Офлайн-кеш недоступен. Приложение продолжает работать онлайн.'));
 }catch(err){$('#app').innerHTML='<div class="boot"><h1>Не удалось открыть хранилище</h1><p>'+e(err.message)+'</p><p>Откройте приложение через локальный сервер в обычном окне браузера.</p><button onclick="location.reload()">Повторить</button></div>'}
}
init();
