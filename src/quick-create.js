import {field,escape as e,openDialog} from './ui.js?v=20261008-single-plan8';
import {newTopic,plannerState,saveTopic,platforms,validDate} from './planner-model.js?v=20261008-single-plan8';
import {uid} from './model.js?v=20261008-single-plan8';

export function quickCreate(state,u,kind,day,onSave){
 const topics=plannerState(state).topics.filter(t=>t.projId===u.projId);
 const labels={topic:'Добавить тему',shoot:'Добавить съёмку без темы',post:'Добавить публикацию'};
 const newTitle=field('newTitle','Название темы','','text',null,true);
 const relation=kind==='topic'?newTitle:field('topicId',kind==='shoot'?'Связать с темой (необязательно)':'Тема','', 'text',[['','Без темы — оставить отдельно'],...topics.map(t=>[t.id,t.title])])+'<div id="quick-new-title">'+newTitle+'</div>';
 let body='<p class="small-note">'+e(state.projects.find(p=>p.id===u.projId)?.name||'')+' · '+(kind==='topic'?'Начните с названия темы. Сценарий, кадры и публикации добавятся в этой же теме.':kind==='shoot'?'Можно сразу связать съёмку с темой или сохранить её отдельно и привязать позже.':'Свяжите публикацию с темой, чтобы сценарий, кадры и площадки оставались вместе.')+'</p>'+relation;
 if(kind==='topic')body+=field('rubric','Категория контента (необязательно)','','text',[['','Без категории'],...state.rubrics.map(r=>[r.id,r.name])])+field('script','Короткая заметка (необязательно)','','textarea');
 if(kind==='shoot')body+=field('sceneTitle','Что нужно снять','','text',null,true)+field('date','Дата съёмки',day||'','date')+field('shots','Кадры / действия (необязательно)','','textarea');
 if(kind==='post')body+=field('platform','Площадка',u.channel||'','text',[['','Выберите площадку'],...Object.keys(platforms).map(p=>[p,p])],true)+'<div id="quick-format">'+field('format','Формат','','text',[['','Выберите формат'],...(platforms[u.channel]||[]).map(f=>[f,f])],true)+'</div>'+field('date','Дата публикации',day||'','date')+field('text','Текст (необязательно)','','textarea');
 openDialog(labels[kind],body,async data=>{
  if(!validDate(data.date))throw Error('Проверьте дату');
  const existing=topics.find(t=>t.id===data.topicId);if(kind!=='topic'&&data.topicId&&!existing)throw Error('Тема не найдена');
  if(kind==='shoot'&&!data.topicId){if(!data.sceneTitle?.trim())throw Error('Укажите, что нужно снять');const next=structuredClone(state);next.shoots.push({id:uid(),projId:u.projId,title:data.sceneTitle.trim(),date:data.date||'',time:'',place:'',desc:data.shots||'',status:'Запланирована'});await onSave(next,kind);return;}
  const topic=existing?structuredClone(existing):newTopic(u.projId);
  if(!existing){if(!data.newTitle?.trim())throw Error('Введите название темы');topic.title=data.newTitle.trim();topic.folderIds=u.folderId?[u.folderId]:[];}
  if(kind==='topic'){topic.rubric=data.rubric||'';topic.script=data.script||'';}
  if(kind==='shoot'){if(!data.sceneTitle?.trim())throw Error('Укажите, что нужно снять');topic.scenes.push({id:uid(),title:data.sceneTitle.trim(),shots:data.shots||'',date:data.date||'',deadline:'',filmed:false,beforeWork:false,workIds:[]});}
  if(kind==='post'){if(!platforms[data.platform]?.includes(data.format))throw Error('Выберите площадку и формат');topic.variants.push({id:uid(),platform:data.platform,format:data.format,date:data.date||'',text:data.text||'',ready:'Черновик',link:''});}
  await onSave(saveTopic(state,topic),kind);
 });
 const dialog=document.querySelector('#modal');dialog.querySelector('[type=submit]').textContent=kind==='topic'?'Добавить тему':kind==='shoot'?'Добавить съёмку':'Добавить публикацию';
 const topicPick=dialog.querySelector('[name=topicId]');if(topicPick){topicPick.onchange=()=>{const box=dialog.querySelector('#quick-new-title');if(!box)return;box.hidden=Boolean(topicPick.value);box.querySelector('input').required=!topicPick.value;};if(kind==='shoot'){const box=dialog.querySelector('#quick-new-title');box.hidden=true;box.querySelector('input').required=false;}}
 const platformPick=dialog.querySelector('[name=platform]');if(platformPick)platformPick.onchange=()=>{dialog.querySelector('#quick-format').innerHTML=field('format','Формат','','text',[['','Выберите формат'],...(platforms[platformPick.value]||[]).map(f=>[f,f])],true);};
}
