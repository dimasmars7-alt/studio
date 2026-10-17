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

function nextButton(item){
 if(!item)return '<span class="overview-complete">Всё готово</span>';
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
 const works=(s.planner?.works||[]).filter(x=>x.projId===u.projId),doneWorks=works.filter(x=>x.status==='Выполнено').length,shotTopics=topics.filter(t=>t.scenes.length&&t.scenes.every(x=>shotStatus(x)==='Снято')).length,critical=topics.flatMap(t=>t.scenes.map(scene=>({topic:t,scene}))).filter(x=>x.scene.beforeWork&&shotStatus(x.scene)!=='Снято'),project=s.projects.find(x=>x.id===u.projId),workPct=works.length?Math.round(doneWorks/works.length*100):0,contentPct=topics.length?Math.round(shotTopics/topics.length*100):0;
 const milestones=[['Прибытие','Завершено'],['Демонтаж рубки','Текущий этап'],['Новая обшивка','Запланировано'],['Покраска','Зависит от погоды'],['Финальный обзор','Запланировано']];
 return '<section class="v2-project-progress"><div class="progress-main"><header><h2>Ход проекта</h2><button type="button" data-action="works" class="works-source-link">'+icon('link')+' '+works.length+' работ проекта</button></header><div class="dual-progress"><div><strong>Технические работы</strong><span>'+doneWorks+' из '+works.length+' выполнена</span><progress value="'+doneWorks+'" max="'+(works.length||1)+'"></progress><b>'+workPct+'%</b></div><div><strong>Производство контента</strong><span>'+shotTopics+' из '+topics.length+' тем снято</span><progress value="'+shotTopics+'" max="'+(topics.length||1)+'"></progress><b>'+contentPct+'%</b></div></div><div class="project-milestones">'+milestones.map((x,i)=>'<div class="'+(i===0?'done':i===1?'active':'')+'"><i></i><strong>'+x[0]+'</strong><small>'+x[1]+'</small></div>').join('')+'</div></div></section>';
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

function overviewSide(s,u,topics,data){const critical=topics.flatMap(t=>t.scenes.map(scene=>({topic:t,scene}))).filter(x=>x.scene.beforeWork&&shotStatus(x.scene)!=='Снято'),project=s.projects.find(x=>x.id===u.projId);return '<aside class="overview-side"><section><h2>Критические кадры</h2>'+(critical.length?'<div class="critical-box"><strong>'+icon('warning')+' Снять до демонтажа</strong><ul>'+critical.slice(0,3).map(x=>'<li>'+e(x.scene.title)+'</li>').join('')+'</ul>'+topicButton(critical[0].topic,'Открыть чек-лист','scenes')+'</div>':'<p class="group-empty">Все обязательные кадры сняты.</p>')+'</section><section><h2>Условия для работ</h2><div class="condition-box"><span>'+icon('suncloud')+'</span><div><strong>'+e(project?.weatherRule||'Проверьте погоду перед наружными работами')+'</strong><small>Условие хранится в настройках проекта</small></div>'+b('project-edit','Изменить')+'</div></section>'+weekTimeline(topics,data.today)+'</aside>';}

export function projectOverview(s,u,topics,tableHtml){
 const data=overviewData(s,u,topics),shoot=data.upcomingShoot,post=data.upcomingPost;
 const critical=topics.flatMap(t=>t.scenes.map(scene=>({topic:t,scene}))).filter(x=>x.scene.beforeWork&&shotStatus(x.scene)!=='Снято');
 const time=shoot?.scene?.shootTime||shoot?.scene?.time||'';
 const shootBody=shoot?topicButton(shoot.topic,'Открыть съёмку','scenes','summary-hit'):b('quick-create','Назначить съёмку','data-kind="shoot"','summary-hit');
 const postBody=post?topicButton(post.topic,'Открыть публикацию','variants','summary-hit'):b('quick-create','Запланировать публикацию','data-kind="post"','summary-hit');
 const cards='<section class="project-summary" aria-label="Обзор проекта">'
  +summaryCard('cal','Ближайшая съёмка',shoot?fullDate(shoot.date)+(time?', '+time:''):'Не назначена',shoot?.topic.title||'Добавьте дату съёмки',shootBody)
  +summaryCard('megaphone','Ближайшая публикация',post?fullDate(post.date):'Не назначена',post?(post.variant.platform||'Площадка')+' · '+post.topic.title:'Добавьте публикацию',postBody)
  +summaryCard('warning','Важные кадры',critical.length+' до демонтажа',critical.length?'Нельзя восстановить позже':'Все обязательные кадры сняты',critical.length?topicButton(critical[0].topic,'Открыть важные кадры','scenes','summary-hit'):'','warning')
  +summaryCard('play','Следующий шаг',data.next?.topic.title||'', '',nextButton(data.next),'next')
  +'</section>';
 return cards+'<div class="overview-layout"><div>'+projectProgress(s,u,topics)+nearTopics(s,u,topics)+'</div>'+overviewSide(s,u,topics,data)+'</div><section class="ai-version-strip"><span>✦ Из одной темы AI подготовит версии для VK, Telegram, Reels, Shorts и YouTube</span>'+b('view','Создать версии публикации','data-view="scripts"','primary')+'</section>';
}

