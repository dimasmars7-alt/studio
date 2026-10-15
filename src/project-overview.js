import {escape as e,button as b} from './ui.js?v=20261014-planner2';
import {moscowDate,addDays,plannerState} from './planner-model.js?v=20261014-planner2';
import {topicMetrics,shortDate} from './topic-metrics.js?v=20261014-planner2';
import {nextAction} from './table-records.js?v=20261014-planner2';
import {shotStatus} from './storyboard.js?v=20261014-planner2';

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

function summaryCard(kind,title,value,note,body,cls=''){
 return '<article class="project-summary-card '+cls+'"><span class="summary-icon" aria-hidden="true">'+kind+'</span><div><small>'+e(title)+'</small><strong>'+e(value)+'</strong><p>'+e(note)+'</p></div>'+body+'</article>';
}

function nextButton(item){
 if(!item)return '<span class="overview-complete">Всё готово</span>';
 const {topic,action}=item;
 if(action.tab==='scenes'&&(action.critical||action.label==='Отметить снятые кадры'))return b('shoot-open',e(action.critical?'Снять важный кадр':'Продолжить съёмку'),'data-topic="'+e(topic.id)+'"','primary overview-action');
 return topicButton(topic,e(action.label),action.tab||'topic','primary overview-action');
}

function weekStrip(topics,today){
 const end=addDays(today,6),days=[];
 for(let i=0;i<7;i++)days.push(addDays(today,i));
 const events=[];
 for(const topic of topics){
  topic.scenes.filter(x=>x.date>=today&&x.date<=end).forEach(scene=>events.push({date:scene.date,topic,kind:'shoot',label:scene.title||topic.title,note:shotStatus(scene)}));
  topic.variants.filter(x=>x.date>=today&&x.date<=end).forEach(v=>events.push({date:v.date,topic,kind:'post',label:topic.title,note:(v.platform||'Площадка')+' · '+(v.format||'Формат')}));
 }
 return '<section class="overview-week"><header><div><h2>План на 7 дней</h2><p>'+fullDate(today)+' — '+fullDate(end)+'</p></div>'+b('view','Открыть календарь','data-view="calendar"')+'</header><div class="overview-week-grid">'+days.map(day=>{const list=events.filter(x=>x.date===day);return '<article class="overview-day '+(day===today?'today':'')+'"><strong>'+new Date(day+'T12:00:00Z').toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Moscow'})+'</strong><div>'+list.map(x=>topicButton(x.topic,'<span>'+e(x.label)+'</span><small>'+e(x.note)+'</small>',x.kind==='shoot'?'scenes':'variants','week-event '+x.kind)).join('')+(list.length?'':'<span class="week-empty">Свободно</span>')+'</div></article>';}).join('')+'</div></section>';
}

function projectProgress(s,u,topics){
 const works=(s.planner?.works||[]).filter(x=>x.projId===u.projId),doneWorks=works.filter(x=>x.status==='Выполнено').length,shotTopics=topics.filter(t=>t.scenes.length&&t.scenes.every(x=>shotStatus(x)==='Снято')).length,critical=topics.flatMap(t=>t.scenes.map(scene=>({topic:t,scene}))).filter(x=>x.scene.beforeWork&&shotStatus(x.scene)!=='Снято'),project=s.projects.find(x=>x.id===u.projId),workPct=works.length?Math.round(doneWorks/works.length*100):0,contentPct=topics.length?Math.round(shotTopics/topics.length*100):0;
 return '<section class="v2-project-progress"><div class="progress-main"><header><div><h2>Ход проекта</h2><p>'+works.length+' работ проекта · '+topics.length+' тем контента</p></div><span class="sync-state">● Данные готовы к синхронизации</span></header><div class="dual-progress"><div><strong>Технические работы</strong><span>'+doneWorks+' из '+works.length+' выполнено</span><progress value="'+doneWorks+'" max="'+(works.length||1)+'"></progress><b>'+workPct+'%</b></div><div><strong>Производство контента</strong><span>'+shotTopics+' из '+topics.length+' тем снято</span><progress value="'+shotTopics+'" max="'+(topics.length||1)+'"></progress><b>'+contentPct+'%</b></div></div></div><aside><h3>Критические кадры</h3>'+(critical.length?'<strong class="critical-total">'+critical.length+' снять до работ</strong>'+critical.slice(0,3).map(x=>topicButton(x.topic,e(x.scene.title),'scenes','critical-shot-link')).join(''):'<p>Критических кадров нет</p>')+(project?.weatherRule?'<div class="weather-rule"><strong>Условия для работ</strong><span>'+e(project.weatherRule)+'</span></div>':'')+'</aside></section>';
}

export function projectOverview(s,u,topics,tableHtml){
 const data=overviewData(s,u,topics),shoot=data.upcomingShoot,post=data.upcomingPost;
 const shootBody=shoot?topicButton(shoot.topic,'Открыть','scenes','summary-link'):b('quick-create','Назначить','data-kind="shoot"','summary-link');
 const postBody=post?topicButton(post.topic,'Открыть','variants','summary-link'):b('quick-create','Запланировать','data-kind="post"','summary-link');
 const cards='<section class="project-summary" aria-label="Обзор проекта">'
  +summaryCard('▣','Ближайшая съёмка',shoot?fullDate(shoot.date):'Не назначена',shoot?.topic.title||'Добавьте дату съёмки',shootBody)
  +summaryCard('↗','Ближайшая публикация',post?fullDate(post.date):'Не назначена',post?(post.variant.platform||'Площадка')+' · '+post.topic.title:'Добавьте публикацию',postBody)
  +summaryCard('!','Просрочено',data.overdue.length+' '+(data.overdue.length===1?'задача':'задачи'),data.overdue[0]?.topic.title||'Сроки в порядке',b('view','Проверить','data-view="table"','summary-link'),'warning')
  +summaryCard('⚑','Следующий шаг',data.next?.topic.title||'Проект готов',data.next?.action.note||'Незавершённых действий нет',nextButton(data.next),'next')
  +'</section>';
 return cards+projectProgress(s,u,topics)+'<section class="overview-table"><header><div><h2>План контента · ближайшие темы</h2><p>Работы, материалы, съёмки и публикации</p></div>'+b('view','Вся таблица','data-view="table"')+'</header>'+tableHtml+'</section>'+weekStrip(topics,data.today)+'<section class="ai-version-strip"><span>✦ Из одной темы AI подготовит версии для VK, Telegram, Reels, Shorts и YouTube</span>'+b('view','Открыть AI-сценарий','data-view="scripts"','primary')+'</section>';
}
