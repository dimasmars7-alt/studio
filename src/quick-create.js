import {field,escape as e,openDialog} from './ui.js?v=20261012-cloud1';
import {newTopic,plannerState,saveTopic,platforms,validDate} from './planner-model.js?v=20261012-cloud1';
import {uid} from './model.js?v=20261012-cloud1';
import {icon} from './icons.js?v=20261012-cloud1';

export function topicFromWizard(state,u,data,workIds=[],platformNames=[]){
 if(!data.newTitle?.trim())throw Error('Введите название темы');
 for(const key of ['shootDate','publishDate','deadline'])if(!validDate(data[key]))throw Error('Проверьте сроки темы');
 const topic=newTopic(u.projId);
 topic.title=data.newTitle.trim();
 topic.folderIds=u.folderId?[u.folderId]:[];
 topic.rubric=data.rubric||'';
 topic.taskStatus=data.taskStatus||'Запланировано';
 topic.contentType=data.contentType||'Видео';
 topic.contentGoal=data.contentGoal||'';
 topic.materialGoal=data.materialGoal||'';
 topic.hero=data.hero||'';
 topic.priority=data.priority||'Обычный';
 topic.approvalRole=data.approvalRole||'';
 topic.teamNote=data.teamNote||'';
 topic.day=data.publishDate||'';
 topic.workIds=[...new Set(workIds)].filter(id=>plannerState(state).works.some(w=>w.id===id&&w.projId===u.projId));
 topic.variants=[...new Set(platformNames)].filter(platform=>platforms[platform]).map(platform=>({id:uid(),platform,format:data['format-'+platform]||(platforms[platform]||[])[0],date:data.publishDate||'',text:'',ready:'Черновик',link:''}));
 if(data.deadline)topic.preparation.push({id:uid(),text:'Подготовить материал',done:false,deadline:data.deadline});
 if(data.shootDate)topic.scenes.push({id:uid(),title:'Основной кадр',shots:'Уточнить в сценарии',date:data.shootDate,deadline:data.shootDate,filmed:false,beforeWork:false,workIds:[...topic.workIds]});
 return topic;
}

export function quickCreate(state,u,kind,day,onSave){
 const topics=plannerState(state).topics.filter(t=>t.projId===u.projId);
 const labels={topic:'Новая тема',shoot:'Добавить съёмку без темы',post:'Добавить публикацию'};
 const newTitle=field('newTitle','Название темы','','text',null,true);
 const relation=kind==='topic'?newTitle:field('topicId',kind==='shoot'?'Связать с темой (необязательно)':'Тема','', 'text',[['','Без темы — оставить отдельно'],...topics.map(t=>[t.id,t.title])])+'<div id="quick-new-title">'+newTitle+'</div>';
 let body='<p class="small-note">'+e(state.projects.find(p=>p.id===u.projId)?.name||'')+' · '+(kind==='topic'?'Начните с названия темы. Сценарий, кадры и публикации добавятся в этой же теме.':kind==='shoot'?'Можно сразу связать съёмку с темой или сохранить её отдельно и привязать позже.':'Свяжите публикацию с темой, чтобы сценарий, кадры и площадки оставались вместе.')+'</p>'+relation;
 if(kind==='topic'){
  const project=state.projects.find(p=>p.id===u.projId);
  const works=plannerState(state).works.filter(w=>w.projId===u.projId);
  const workChoices=works.length?'<fieldset class="topic-linked-works"><legend>Связанные работы</legend><div>'+works.map(w=>'<label><input type="checkbox" name="workIds" value="'+e(w.id)+'"><span>'+e(w.name)+'</span></label>').join('')+'</div></fieldset>':'<p class="small-note">Работы проекта можно связать с темой после её создания.</p>';
  const platformChoices=Object.entries(platforms).map(([platform,formats])=>'<div class="platform-option"><label><input type="checkbox" name="platforms" value="'+e(platform)+'"><span><strong>'+e(platform)+'</strong><small>Создать вариант публикации</small></span></label><select name="format-'+e(platform)+'" aria-label="Формат для '+e(platform)+'">'+formats.map(format=>'<option value="'+e(format)+'">'+e(format)+'</option>').join('')+'</select></div>').join('');
  body='<div class="topic-wizard-head"><p>Добавьте тему в проект «'+e(project?.name||'')+'»</p><div class="topic-wizard-steps" aria-label="Шаги создания темы"><span class="active" data-wizard-dot="0"><b>1</b>Основное</span><span data-wizard-dot="1"><b>2</b>Площадки</span><span data-wizard-dot="2"><b>3</b>Сроки</span></div></div>'+
   '<section class="topic-wizard-page active" data-wizard-page="0">'+newTitle+'<p class="topic-field-hint">Коротко опишите, о чём будет материал.</p>'+field('contentGoal','Задача контента','','textarea')+'<div class="topic-field-label">Тип материала</div><div class="content-type-picker">'+[['Видео','camera'],['Фото','portfolio'],['Пост','content'],['Статья','content']].map(([name,symbol],i)=>'<label><input type="radio" name="contentType" value="'+name+'" '+(!i?'checked':'')+'><span>'+icon(symbol)+name+'</span></label>').join('')+'</div><div class="field-pair">'+field('taskStatus','Статус задачи','Запланировано','text',[['Запланировано','Запланировано'],['Подготовка','Подготовка'],['В работе','В работе'],['На согласовании','На согласовании']])+field('rubric','Рубрика','','text',[['','Без рубрики'],...state.rubrics.map(r=>[r.id,r.name])])+'</div><details class="topic-extra" open><summary>'+icon('settings')+' Дополнительные параметры</summary><div class="field-pair">'+field('materialGoal','Цель материала','Показать экспертность','text',[['Показать экспертность','Показать экспертность'],['Показать процесс','Показать процесс'],['Объяснить работу','Объяснить работу'],['Показать результат','Показать результат']])+field('hero','Герой в кадре','','text')+'</div><div class="field-pair"><fieldset class="topic-priority"><legend>Приоритет</legend><label><input type="radio" name="priority" value="Обычный" checked><span>Обычный</span></label><label><input type="radio" name="priority" value="Важный"><span>Важный</span></label></fieldset>'+field('approvalRole','Согласует','Генеральный директор','text',[['Генеральный директор','Генеральный директор'],['Автор','Автор'],['Совместно','Совместно']])+'</div>'+workChoices+field('teamNote','Заметка для команды','','textarea')+'</details></section>'+
   '<section class="topic-wizard-page" data-wizard-page="1"><h3>Площадки и форматы</h3><p class="small-note">Выберите нужные площадки и формат для каждой. Все варианты останутся внутри одной темы.</p><div class="platform-check-grid">'+platformChoices+'</div></section>'+
   '<section class="topic-wizard-page" data-wizard-page="2"><h3>Сроки подготовки</h3><div class="field-pair">'+field('shootDate','Дата съёмки',day||'','date')+field('publishDate','Дата публикации','','date')+'</div>'+field('deadline','Крайний срок подготовки','','date')+'<div class="wizard-info">После создания можно добавить AI-сценарий, кадры, фотографии и публикации.</div></section>';
 }
 if(kind==='shoot')body+=field('sceneTitle','Что нужно снять','','text',null,true)+field('date','Дата съёмки',day||'','date')+field('shots','Кадры / действия (необязательно)','','textarea');
 if(kind==='post')body+=field('platform','Площадка',u.channel||'','text',[['','Выберите площадку'],...Object.keys(platforms).map(p=>[p,p])],true)+'<div id="quick-format">'+field('format','Формат','','text',[['','Выберите формат'],...(platforms[u.channel]||[]).map(f=>[f,f])],true)+'</div>'+field('date','Дата публикации',day||'','date')+field('text','Текст (необязательно)','','textarea');
 openDialog(labels[kind],body,async data=>{
  if(!validDate(data.date))throw Error('Проверьте дату');
  const existing=topics.find(t=>t.id===data.topicId);if(kind!=='topic'&&data.topicId&&!existing)throw Error('Тема не найдена');
  if(kind==='shoot'&&!data.topicId){if(!data.sceneTitle?.trim())throw Error('Укажите, что нужно снять');const next=structuredClone(state);next.shoots.push({id:uid(),projId:u.projId,title:data.sceneTitle.trim(),date:data.date||'',time:'',place:'',desc:data.shots||'',status:'Запланирована'});await onSave(next,kind);return;}
  const chosenWorks=kind==='topic'?[...document.querySelectorAll('#modal input[name=workIds]:checked')].map(x=>x.value):[];
  const chosenPlatforms=kind==='topic'?[...document.querySelectorAll('#modal input[name=platforms]:checked')].map(x=>x.value):[];
  const topic=kind==='topic'?topicFromWizard(state,u,data,chosenWorks,chosenPlatforms):existing?structuredClone(existing):newTopic(u.projId);
  if(kind!=='topic'&&!existing){if(!data.newTitle?.trim())throw Error('Введите название темы');topic.title=data.newTitle.trim();topic.folderIds=u.folderId?[u.folderId]:[];}
  if(kind==='shoot'){if(!data.sceneTitle?.trim())throw Error('Укажите, что нужно снять');topic.scenes.push({id:uid(),title:data.sceneTitle.trim(),shots:data.shots||'',date:data.date||'',deadline:'',filmed:false,beforeWork:false,workIds:[]});}
  if(kind==='post'){if(!platforms[data.platform]?.includes(data.format))throw Error('Выберите площадку и формат');topic.variants.push({id:uid(),platform:data.platform,format:data.format,date:data.date||'',text:data.text||'',ready:'Черновик',link:''});}
  await onSave(saveTopic(state,topic),kind);
 });
 const dialog=document.querySelector('#modal');dialog.classList.toggle('topic-wizard-dialog',kind==='topic');dialog.querySelector('[type=submit]').textContent=kind==='topic'?'Создать тему':kind==='shoot'?'Добавить съёмку':'Добавить публикацию';
 if(kind==='topic'){
  let step=0;
  const form=dialog.querySelector('form'),footer=form.querySelector('footer'),submit=footer.querySelector('[type=submit]');
  const back=document.createElement('button'),next=document.createElement('button'),later=document.createElement('button');
  back.type='button';back.textContent='← Назад';back.className='wizard-back';
  next.type='button';next.className='primary wizard-next';
  later.type='button';later.className='wizard-later';later.textContent='Создать и заполнить позже';
  footer.insertBefore(later,footer.firstChild);
  footer.insertBefore(back,footer.querySelector('#cancel-dialog'));
  footer.insertBefore(next,submit);
  const paint=()=>{
   dialog.querySelectorAll('[data-wizard-page]').forEach(x=>x.classList.toggle('active',Number(x.dataset.wizardPage)===step));
   dialog.querySelectorAll('[data-wizard-dot]').forEach(x=>{const selected=Number(x.dataset.wizardDot)===step;x.classList.toggle('active',selected);x.classList.toggle('completed',Number(x.dataset.wizardDot)<step);if(selected)x.setAttribute('aria-current','step');else x.removeAttribute('aria-current');});
   back.hidden=step===0;next.hidden=step===2;submit.hidden=step!==2;
   next.textContent=step===0?'Далее: площадки →':'Далее: сроки →';
  };
  next.onclick=()=>{if(step===0&&!form.querySelector('[name=newTitle]').value.trim()){form.querySelector('[name=newTitle]').reportValidity();return;}step=Math.min(2,step+1);paint();const heading=dialog.querySelector('[data-wizard-page="'+step+'"] h3');if(heading){heading.tabIndex=-1;heading.focus();}};
  back.onclick=()=>{step=Math.max(0,step-1);paint();};
  later.onclick=()=>form.requestSubmit(submit);
  paint();
  form.querySelector('[name=newTitle]')?.focus();
 }
 const topicPick=dialog.querySelector('[name=topicId]');if(topicPick){topicPick.onchange=()=>{const box=dialog.querySelector('#quick-new-title');if(!box)return;box.hidden=Boolean(topicPick.value);box.querySelector('input').required=!topicPick.value;};if(kind==='shoot'){const box=dialog.querySelector('#quick-new-title');box.hidden=true;box.querySelector('input').required=false;}}
 const platformPick=dialog.querySelector('[name=platform]');if(platformPick)platformPick.onchange=()=>{dialog.querySelector('#quick-format').innerHTML=field('format','Формат','','text',[['','Выберите формат'],...(platforms[platformPick.value]||[]).map(f=>[f,f])],true);};
}

