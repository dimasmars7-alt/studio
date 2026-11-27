import {escape as e,button as b} from './ui.js?v=20261014-planner2';
import {moscowDate,addDays,plannerState} from './planner-model.js?v=20261014-planner2';
import {topicMetrics,shortDate} from './topic-metrics.js?v=20261014-planner2';
import {nextAction} from './table-records.js?v=20261014-planner2';
import {shotStatus} from './storyboard.js?v=20261014-planner2';
import {icon} from './icons.js?v=20261012-cloud1';

const fullDate=value=>value?new Date(value+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'Europe/Moscow'}):'Дата не назначена';
const topicButton=(topic,label,tab,cls='')=>b('topic-open',label,'data-id="'+e(topic.id)+'" data-tab="'+tab+'"',cls);
const byDate=(a,b)=>a.date.localeCompare(b.date);

function overviewData(s,u,topics){
 const today=moscowDate(),shoots=[],publications=[],overdue=[];
 for(const topic of topics){
  for(const scene of topic.scenes){
   if(shotStatus(scene)==='Снято')continue;
   if(scene.date){shoots.push({date:scene.date,topic,scene});if(scene.date<today)overdue.push({date:scene.date,topic,label:'Съёмка просрочена'});}
   if(scene.deadline&&scene.deadline<today)overdue.push({date:scene.deadline,topic,label:'Просрочен срок кадра'});
  }
  for(const variant of topic.variants){
   if(variant.ready==='Опубликовано')continue;
   if(variant.date){publications.push({date:variant.date,topic,variant});if(variant.date<today)overdue.push({date:variant.date,topic,label:'Публикация просрочена'});}
  }
 }
 const upcomingShoot=shoots.filter(x=>x.date>=today).sort(byDate)[0]||null;
 const upcomingPost=publications.filter(x=>x.date>=today).sort(byDate)[0]||null;
 const ranked=topics.map(topic=>({topic,action:nextAction(topic),metrics:topicMetrics(s,topic)})).filter(x=>!x.action.done).sort((a,b)=>Number(Boolean(b.action.critical))-Number(Boolean(a.action.critical)));
 return {today,upcomingShoot,upcomingPost,overdue,next:ranked[0]||null};
}

function summaryCard(kind,title,value,note,body='',cls=''){
 return '<article class="project-summary-card '+cls+'"><span class="summary-icon" aria-hidden="true">'+icon(kind)+'</span><div><small>'+e(title)+'</small><strong>'+e(value)+'</strong><p>'+e(note)+'</p></div>'+body+'</article>';
}

function nextButton(item,hasTopics){
 if(!item)return hasTopics?'<span class="overview-complete">Всё готово</span>':b('quick-create','Добавить тему','data-kind="topic"','primary overview-action');
 const {topic,action}=item;
 if(action.tab==='scenes'&&(action.critical||action.label==='Отметить снятые кадры'))return b('shoot-open',e(action.critical?'Снять важный кадр':'Продолжить съёмку'),'data-topic="'+e(topic.id)+'"','primary overview-action');
 return topicButton(topic,e(action.label),action.tab||'topic','primary overview-action');
}

function weekTimeline(topics,today){
 const end=addDays(today,6),days=[];
 for(let i=0;i<7;i++)days.push(addDays(today,i));
 const events=[];
 for(const topic of topics){
  topic.scenes.filter(x=>x.date>=today&&x.date<=end).forEach(scene=>events.push({date:scene.date,topic,kind:'shoot',label:scene.title||topic.title,note:shotStatus(scene)}));
  topic.variants.filter(x=>x.date>=today&&x.date<=end).forEach(v=>events.push({date:v.date,topic,kind:'post',label:topic.title,note:(v.platform||'Площадка')+' · '+(v.format||'Формат')}));
 }
 const visible=events.sort(byDate).slice(0,5);
 return '<section class="overview-week"><header><h2>Ближайшие 7 дней</h2>'+b('view','Открыть','data-view="calendar"')+'</header><div class="week-timeline">'+(visible.length?visible.map(x=>'<article class="'+(x.date===today?'today':'')+'"><time>'+new Date(x.date+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'short',timeZone:'Europe/Moscow'})+'</time><i></i>'+topicButton(x.topic,'<span>'+e(x.kind==='shoot'?'Съёмка: ':'Публикация: ')+e(x.label)+'</span><small>'+e(x.note)+'</small>',x.kind==='shoot'?'scenes':'variants','week-timeline-event')+'</article>').join(''):'<p class="group-empty">На ближайшую неделю событий нет.</p>')+'</div></section>';
}

function projectProgress(s,u,topics){
 const works=(s.planner?.works||[]).filter(x=>x.projId===u.projId),doneWorks=works.filter(x=>x.status==='Выполнено').length,shotTopics=topics.filter(t=>t.scenes.length&&t.scenes.every(x=>shotStatus(x)==='Снято')).length,workPct=works.length?Math.round(doneWorks/works.length*100):0,contentPct=topics.length?Math.round(shotTopics/topics.length*100):0;
 const ordered=works.map((work,index)=>({...work,index})).sort((a,b)=>Number(Boolean(b.startDate))-Number(Boolean(a.startDate))||(a.startDate||'').localeCompare(b.startDate||'')||a.index-b.index);
 const firstPendingIndex=ordered.findIndex(x=>x.status!=='Выполнено'&&x.status!=='Отложено'),firstPending=ordered[firstPendingIndex]?.id;
 const stageStart=Math.max(0,Math.min(firstPendingIndex<0?ordered.length-5:firstPendingIndex-1,ordered.length-5)),milestones=ordered.slice(stageStart,stageStart+5);
 const stages=milestones.length?'<div class="project-milestones" style="--milestone-count:'+milestones.length+'">'+milestones.map(work=>{const done=work.status==='Выполнено',active=work.status==='В работе'||work.id===firstPending,detail=done?'Выполнено':work.status==='В работе'?'В работе':work.status==='Отложено'?'Отложено':work.id===firstPending?'Следующая работа':'Запланировано';return '<div class="'+(done?'done':active?'active':'')+'" title="'+e(work.name)+'"><i></i><strong>'+e(work.name)+'</strong><small>'+e(detail)+(work.startDate?' · '+e(shortDate(work.startDate)):'')+'</small></div>';}).join('')+'</div>'+(works.length>milestones.length?'<p class="project-stage-count">Показаны работы '+(stageStart+1)+'–'+(stageStart+milestones.length)+' из '+works.length+'. Все работы — по кнопке выше.</p>':''):'<div class="project-stage-empty"><p>Работы ещё не добавлены. После добавления здесь появятся этапы этого проекта.</p>'+b('works','Добавить первую работу','','primary')+'</div>';
 return '<section class="v2-project-progress"><div class="progress-main"><header><h2>Ход проекта</h2><button type="button" data-action="works" class="works-source-link">'+icon('link')+' '+works.length+' работ проекта</button></header><div class="dual-progress"><div><strong>Технические работы</strong><span>'+doneWorks+' из '+works.length+' выполнено</span><progress value="'+doneWorks+'" max="'+(works.length||1)+'"></progress><b>'+workPct+'%</b></div><div><strong>Производство контента</strong><span>'+shotTopics+' из '+topics.length+' тем снято</span><progress value="'+shotTopics+'" max="'+(topics.length||1)+'"></progress><b>'+contentPct+'%</b></div></div>'+stages+'</div></section>';
}

function stageChips(topic){const scenes=topic.scenes||[],groups=[['До','До'],['Процесс','В процессе'],['После','После']];return '<span class="stage-chips">'+groups.map(([short,name])=>{const list=scenes.filter(x=>(x.stage||'').toLowerCase().includes(name.toLowerCase())||(name==='До'&&x.beforeWork));const done=list.length&&list.every(x=>shotStatus(x)==='Снято');return '<i class="'+(done?'done':list.length?'active':'empty')+'">'+short+(done?' ✓':list.length?' '+list.filter(x=>shotStatus(x)==='Снято').length+'/'+list.length:' —')+'</i>';}).join('')+'</span>';}
function platformChips(topic){const values=[...new Set(topic.variants.map(v=>v.platform).filter(Boolean))];return '<span class="platform-chips">'+(values.length?values.slice(0,3).map(x=>'<i>'+e(x==='Telegram'?'TG':x)+'</i>').join(''):'<i>—</i>')+'</span>';}
function topicThumb(s,topic){
 const file=s.files.find(f=>f.topicId===topic.id&&/^image\//.test(f.type||'')),image=file&&/^data:image\/(png|jpeg|webp|gif|avif);base64,/i.test(file.data||'')?'<img src="'+e(file.data)+'" alt="">':file?.storagePath?'<img data-cloud-file="'+e(file.id)+'" alt="" hidden>':'';
 return b('topic-media',image+icon('camera'),'data-id="'+e(topic.id)+'" aria-label="Фотографии темы: '+e(topic.title)+'"','topic-thumb');
}
function nearTopics(s,u,topics){
 return '<section class="near-topics" id="table"><header><h2>Ближайшие темы</h2></header><div class="near-topic-head"><span>#</span><span>Тема</span><span>Работы</span><span>Кадры</span><span>Материалы</span><span>Площадки</span><span>Действие</span></div>'
 +topics.slice(0,4).map((topic,i)=>{const files=s.files.filter(f=>f.topicId===topic.id).length,action=nextAction(topic);
 return '<article class="near-topic-row"><b>'+String(i+1).padStart(2,'0')+'</b><div class="near-topic-title">'+topicThumb(s,topic)+'<span><strong>'+e(topic.title)+'</strong><small>'+e(topic.taskStatus||'Запланировано')+'</small></span></div><span>'+topic.workIds.length+' '+(topic.workIds.length===1?'работа':'работ')+'</span>'+stageChips(topic)+'<span class="file-count">'+icon('paperclip')+' '+files+' файлов</span>'+platformChips(topic)+topicButton(topic,e(action.label),action.tab||'topic','near-topic-action '+(i===2?'primary':''))+'</article>';}).join('')
 +'<footer>'+b('view','Открыть все '+topics.length+' тем →','data-view="table"')+'</footer></section>';
}

function overviewSide(s,u,topics,data){const critical=topics.flatMap(t=>t.scenes.map(scene=>({topic:t,scene}))).filter(x=>x.scene.beforeWork&&shotStatus(x.scene)!=='Снято');return '<aside class="overview-side"><section><h2>Критические кадры</h2>'+(critical.length?'<div class="critical-box"><strong>'+icon('warning')+' Снять до демонтажа</strong><ul>'+critical.slice(0,3).map(x=>'<li>'+e(x.scene.title)+'</li>').join('')+'</ul>'+topicButton(critical[0].topic,'Открыть чек-лист','scenes')+'</div>':'<p class="group-empty">'+(topics.length?'Все обязательные кадры сняты.':'Важные кадры пока не добавлены.')+'</p>')+'</section>'+weekTimeline(topics,data.today)+'</aside>';}

function projectStatus(topics){
 const hasTopics=topics.length>0, scenes=topics.flatMap(t=>t.scenes||[]), variants=topics.flatMap(t=>t.variants||[]), shot=scenes.length>0&&scenes.every(x=>shotStatus(x)==='Снято'), published=variants.length>0&&variants.every(x=>x.ready==='Опубликовано');
 const active=published?3:shot?2:hasTopics?1:0, labels=['Идея','Подготовка','Съёмка','Публикация'], icons=['✦','◌','▣','↗'];
 const steps=labels.map((label,i)=>(i?'<b class="status-line '+(i-1<active?'done':'')+'"></b>':'')+'<div class="status-step '+(i<active?'done ':'')+(i===active?'active':'')+'"><i>'+icons[i]+'</i><span>'+label+'</span></div>').join('');
 return '<section class="project-status-strip" aria-label="Статус проекта"><div class="status-title"><strong>Статус проекта</strong><small>'+(['Начните с первой темы','Подготовьте тему и кадры','Съёмка в работе','Проект опубликован'][active])+'</small></div><div class="status-steps">'+steps+'</div><span class="status-count">Этап '+(active+1)+' из 4</span></section>';
}

function emptyMetric(kind,label,value,hint){return '<article class="overview-metric"><span class="summary-icon" aria-hidden="true">'+icon(kind)+'</span><div><strong>'+e(label)+'</strong><b>'+e(value)+'</b><small>'+e(hint)+'</small></div></article>';}
function overviewStage(topics){const scenes=topics.flatMap(t=>t.scenes||[]),variants=topics.flatMap(t=>t.variants||[]),shot=scenes.length>0&&scenes.every(x=>shotStatus(x)==='Снято'),published=variants.length>0&&variants.every(x=>x.ready==='Опубликовано'),active=published?3:shot?2:topics.length?0:0,labels=['Подготовка','Съёмка','Подготовка материала','Публикация'],icons=['cal','camera','content','play'];const steps=labels.map((label,i)=>(i?'<b class="overview-stage-line '+(i<=active?'done':'')+'"></b>':'')+'<div class="overview-stage '+(i===active?'active ':'')+(i<active?'done':'')+'"><i>'+icon(icons[i])+'</i><strong>'+label+'</strong></div>').join('');return '<section class="overview-stage-card"><div class="overview-stage-row">'+steps+'</div><p class="overview-help">Этап проекта: что делаем сейчас и какой следующий шаг</p><strong class="overview-current-note">'+(['Сценарий, список кадров и дата съёмки','Проводим съёмку и отмечаем готовые кадры','Отбираем, монтируем и обрабатываем материалы','Готовим финальные версии и размещаем их на площадках'][active])+'</strong></section>';}
function actionRows(s,u,topics){const rows=[];const next=topics.map(topic=>({topic,action:nextAction(topic)})).filter(x=>!x.action.done).sort((a,b)=>Number(Boolean(b.action.critical))-Number(Boolean(a.action.critical)))[0];if(next)rows.push(topicButton(next.topic,e(next.action.label),'topic','overview-action-row'));if(topics.some(t=>t.scenes.some(x=>!x.date&&shotStatus(x)!=='Снято')))rows.push(b('quick-create','Назначить съёмку','data-kind="shoot"','overview-action-row'));if(!rows.length&&topics.length)rows.push(b('view','Открыть таблицу контента','data-view="table"','overview-action-row'));if(!rows.length)rows.push(b('quick-create','Добавить первую тему','data-kind="topic"','overview-action-row'));return rows.slice(0,3).join('');}
function projectStateRows(topics){const scenes=topics.flatMap(t=>t.scenes||[]),variants=topics.flatMap(t=>t.variants||[]),scripts=topics.filter(t=>t.script?.trim()).length,prepared=topics.filter(t=>t.scenes.length&&t.scenes.every(x=>shotStatus(x)==='Снято')&&t.variants.length).length;return [['cal','Подготовка',Math.max(0,topics.length-scripts)+' задач'],['camera','Съёмка',scenes.length+' '+(scenes.length===1?'дата':'даты')],['content','Подготовка материала',prepared+' '+(prepared===1?'материал':'материалов')],['play','Публикация',variants.length+' запланировано']].map(([kind,label,value])=>'<div class="overview-state-row"><span>'+icon(kind)+'</span><strong>'+label+'</strong><small>'+value+'</small></div>').join('');}
export function projectOverview(s,u,topics){const scenes=topics.flatMap(t=>t.scenes||[]),variants=topics.flatMap(t=>t.variants||[]),files=s.files.filter(f=>topics.some(t=>t.id===f.topicId)).length;return overviewStage(topics)+'<section class="project-overview-metrics" aria-label="Показатели проекта">'+emptyMetric('content','Темы',String(topics.length),'идеи и материалы проекта')+emptyMetric('camera','Съёмки',String(scenes.length),'назначенные даты')+emptyMetric('content','Материалы',files+' из '+Math.max(topics.length,files),'снято и обработано')+emptyMetric('play','Публикации',String(variants.length),'готово к выходу')+'</section><div class="overview-focus-grid"><section class="overview-focus-card"><header><div><h2>Что сейчас <span title="Главные действия на текущем этапе">ⓘ</span></h2><p>Главные действия на текущем этапе</p></div></header><div class="overview-action-list">'+actionRows(s,u,topics)+'</div></section><section class="overview-focus-card"><header><div><h2>Состояние проекта <span title="Прогресс по производству контента">ⓘ</span></h2><p>Прогресс по производству контента</p></div></header><div class="overview-state-list">'+projectStateRows(topics)+'</div></section></div><section class="overview-activity"><header><div><h2>Последние изменения <span title="Что менялось в проекте недавно">ⓘ</span></h2><p>Что менялось в проекте недавно</p></div></header><p class="group-empty">Изменения появятся после добавления тем, съёмок и публикаций.</p></section>';}


