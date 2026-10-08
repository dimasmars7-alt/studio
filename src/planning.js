import {escape as e,field,button as b,badge,pretty} from './ui.js?v=20261008-topic-only7';
export function moscowDate(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),value=type=>parts.find(x=>x.type===type).value;return value('year')+'-'+value('month')+'-'+value('day');}
export function addDays(key,n){const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const statusName=(s,x)=>(s.statuses.find(v=>v.id===x.status)?.name||'').trim();
export function published(s,x){return /^(опубликован[аоы]?|published)$/i.test(statusName(s,x));}
export function readiness(s,x){
 if(published(s,x))return 'Опубликовано';
 const name=statusName(s,x);
 if(!x.text?.trim())return 'Нет сценария';
 if(/^(готов[аоы]?|готов[аоы]? к публикации|ready)$/i.test(name))return 'Готово по статусу';
 if(/^(черновик|идея|в работе|на согласовании|draft)$/i.test(name))return 'Статус: '+name;
 return name?'Проверьте статус: '+name:'Статус не указан';
}
export function weekOverview(s,u,today=moscowDate()){
 const end=addDays(today,6),scope=s.posts.filter(x=>x.projId===u.projId&&(!u.postSocial||x.social===u.postSocial));
 const planned=scope.filter(x=>x.date>=today&&x.date<=end&&!published(s,x)).sort((a,b)=>a.date.localeCompare(b.date));
 const needs=planned.filter(x=>readiness(s,x)!=='Готово по статусу');
 const overdue=scope.filter(x=>x.date&&x.date<today&&!published(s,x)).sort((a,b)=>a.date.localeCompare(b.date));
 return {today,end,planned,needs,overdue};
}
export function weekHtml(s,u){
 const w=weekOverview(s,u),full=key=>new Date(key+'T12:00:00Z').toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric'});
 const scope=e(s.projects.find(x=>x.id===u.projId)?.name||'Проект')+' · '+e(u.postSocial?(s.socials.find(x=>x.id===u.postSocial)?.name||u.postSocial.replace('platform:','')):'Все площадки');
 return '<section class="card cp-week"><div class="cp-week-heading"><h2>Ближайшие 7 дней</h2><span>'+e(full(w.today))+' — '+e(full(w.end))+'</span></div><p class="cp-week-note">'+scope+' · по Москве · без ограничения поиском и фильтром статуса</p><div class="cp-week-grid">'+[['planned','Запланировано',w.planned],['needs','Требуют внимания',w.needs],['overdue','Срок прошёл',w.overdue]].map(([key,title,rows])=>'<div class="cp-week-group"><h3>'+title+' <span class="cp-count">'+rows.length+'</span></h3>'+(rows.length?rows.map(x=>b('edit','<strong>'+e(x.title)+'</strong><span>'+pretty(x.date)+' · '+e(s.socials.find(v=>v.id===x.social)?.name||'Без площадки')+'</span><small>'+e(readiness(s,x))+'</small>','data-type="posts" data-id="'+e(x.id)+'"','cp-week-post')).join(''):'<p class="muted">Нет публикаций</p>')+'</div>').join('')+'</div><p class="cp-week-note">«Срок прошёл» — дата раньше сегодня, статус не подтверждает публикацию. Для пользовательских статусов проверьте запись; наличие текста само по себе не означает готовность.</p></section>';
}
export const templates={video:'НАЧАЛО\n[Как привлечь внимание и обозначить тему]\n\nСЦЕНЫ / КАДРЫ\n[Последовательность кадров и действий]\n\nРЕПЛИКИ\n[Что сказать в кадре или за кадром]\n\nЗАВЕРШЕНИЕ\n[Вывод и следующий шаг для зрителя]',post:'ОСНОВНАЯ МЫСЛЬ\n[Что читатель должен понять]\n\nТЕКСТ\n[Вступление и основной текст]\n\nФОТОГРАФИИ\n[Какие фотографии выбрать и в каком порядке]\n\nЗАВЕРШЕНИЕ\n[Вывод и следующий шаг для читателя]'};
export function publicationForm(s,u,x,platforms,date){
 const f=(name,label,value='',kind='text',options=null,required=false)=>field(name,label,x[name]??value,kind,options,required);
 const options=(rows,value,label)=>[['',label],...rows.map(v=>[v.id,v.name||v.title]),...(value&&!rows.some(v=>v.id===value)?[[value,'Связь недоступна (сохранена)']]:[])];
 const files=s.files.filter(v=>v.projId===(x.projId||u.projId));
 return '<div class="cp-publication-form">'+f('title','Тема публикации','','text',null,true)+'<div class="form-grid">'+f('social','Площадка',u.postSocial,'text',options(platforms,x.social,'Не выбрано'))+f('format','Формат','post','text',[['post','Пост'],['stories','Сторис'],['video','Видео'],...(x.format&&!['post','stories','video'].includes(x.format)?[[x.format,x.format]]:[])])+f('date','Дата публикации',date||moscowDate(),'date',null,!x.id)+f('status','Статус',s.statuses[0]?.id||'','text',options(s.statuses,x.status,'Не выбрано'))+f('rubric','Рубрика','','text',options(s.rubrics,x.rubric,'Не выбрано'))+'</div>'+f('text','Сценарий: текст поста или план видео','','textarea')+'<div class="cp-template-actions" aria-label="Шаблоны сценариев">'+b('script-template','Добавить шаблон видео','data-template="video"')+b('script-template','Добавить шаблон поста','data-template="post"')+'</div><p class="cp-week-note">Шаблон добавится в конец текста. Изменения сохраняются только кнопкой «Сохранить».</p><details class="cp-publication-details"><summary>Связанные съёмка, работа и ссылка</summary>'+f('shootId','Съёмка','','text',options(s.shoots,x.shootId,'Без съёмки'))+f('portfolioId','Работа / фотографии из портфолио','','text',options(s.portfolio,x.portfolioId,'Без работы'))+f('link','Ссылка на материал','','url')+'<p class="cp-week-note">Выберите существующую работу из портфолио или укажите ссылку. Загрузка фотографий в карточку не предусмотрена.</p><div class="cp-project-files"><strong>Файлы проекта</strong><p class="cp-week-note">'+(files.length?files.map(v=>e(v.name)).join(' · '):'Файлов пока нет.')+' Файлы относятся к проекту, а не к отдельной публикации.</p></div></details></div>';
}

