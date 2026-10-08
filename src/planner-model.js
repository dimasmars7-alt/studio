import {validateTiming} from './scene-timing.js?v=20261008-topic-only7';
import {uid} from './model.js?v=20261008-topic-only7';
import {moscowDate,addDays,published} from './planning.js?v=20261008-topic-only7';
export {moscowDate,addDays};
export const platforms={Telegram:['Пост','Фото','Видео'],VK:['Пост','Клип','Видео','Альбом'],Instagram:['Публикация','Сторис','Reels'],YouTube:['Shorts','Выпуск']};
export const approval=['Не отправлено','На согласовании','Согласовано','Нужны правки'];
export const readiness=['Черновик','Готово','Опубликовано'];
const legacyFormat=(platform,post)=>post.format==='video'?(platform==='Instagram'?'Reels':platform==='YouTube'?'Выпуск':'Видео'):post.format==='stories'?'Сторис':platform==='Instagram'?'Публикация':'Пост';
export function validDate(value){if(!value)return true;try{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}catch{return false}}
export function plannerState(s){return s.planner||{version:1,topics:[],works:[],folders:[]};}
export function importLegacy(s){
 const next=structuredClone(s);next.planner=plannerState(next);let changed=!s.planner;
 const known=new Map(next.planner.topics.flatMap(t=>t.variants.filter(v=>v.legacyPostId).map(v=>[v.legacyPostId,{t,v}])));
 for(const post of next.posts){
 const found=known.get(post.id),social=next.socials.find(x=>x.id===post.social),platform=social?.name||'Не выбрано';
 if(found){const {t,v}=found,sourceText=post.text||'';if(t.variants.length===1&&t.script===v.text&&t.script!==sourceText){t.script=sourceText;changed=true;}if(t.variants.every(item=>{const source=next.posts.find(x=>x.id===item.legacyPostId);return !source||source.title===post.title})&&t.title!==post.title){t.title=post.title;changed=true;}
 const coarse=['Reels','Shorts','Видео','Клип','Выпуск'].includes(v.format)?'video':v.format==='Сторис'?'stories':'post',sync={text:sourceText,date:post.date||'',legacyStatus:post.status||'',legacySocial:post.social||'',link:post.link||'',ready:published(next,post)?'Опубликовано':v.ready==='Опубликовано'?'Черновик':v.ready};if(v.legacySocial!==(post.social||'')){sync.platform=platform;sync.format=legacyFormat(platform,post);}else if(coarse!==(post.format||'post'))sync.format=legacyFormat(platform,post);if(Object.entries(sync).some(([k,val])=>v[k]!==val)){Object.assign(v,sync);changed=true;}continue;}
 const format=legacyFormat(platform,post);
 next.planner.topics.push({id:uid(),projId:post.projId,title:post.title,script:post.text||'',rubric:post.rubric||'',workIds:[],scenes:[],preparation:[],approval:'Не отправлено',answers:{},legacyShootId:post.shootId||'',legacyPortfolioId:post.portfolioId||'',variants:[{id:uid(),legacyPostId:post.id,legacyStatus:post.status||'',legacySocial:post.social||'',platform,format,text:post.text||'',date:post.date||'',ready:published(next,post)?'Опубликовано':'Черновик',link:post.link||''}]});changed=true;
 }
 return {state:next,changed};
}
export function newTopic(projId){return {id:uid(),projId,title:'',script:'',rubric:'',workIds:[],scenes:[],variants:[],preparation:[],approval:'Не отправлено',answers:{}};}
export function saveTopic(s,topic){
 validateTopic(s,topic);const next=structuredClone(s);next.planner=plannerState(next);const old=next.planner.topics.find(x=>x.id===topic.id),keep=new Set(topic.variants.map(v=>v.legacyPostId).filter(Boolean));
 const removed=old?.variants.filter(v=>v.legacyPostId&&!keep.has(v.legacyPostId)).map(v=>v.legacyPostId)||[];next.posts=next.posts.filter(x=>!removed.includes(x.id));
 const record=structuredClone(topic);
 for(const v of record.variants){
 let social=next.socials.find(x=>x.id===v.legacySocial)||next.socials.find(x=>x.name.toLowerCase()===v.platform.toLowerCase());
 if(!social&&v.platform!=='Не выбрано'){social={id:uid(),name:v.platform,color:'#7054d8'};next.socials.push(social);}v.legacySocial=social?.id||'';
 let status=next.statuses.find(x=>x.id===v.legacyStatus);
 if(v.ready==='Опубликовано'&&(!status||!published(next,{status:status.id}))){status=next.statuses.find(x=>published(next,{status:x.id}));if(!status){status={id:uid(),name:'Опубликован',color:'#28745b'};next.statuses.push(status);}}
 if(v.ready!=='Опубликовано'&&status&&published(next,{status:status.id}))status=next.statuses.find(x=>!published(next,{status:x.id}));
 v.legacyStatus=status?.id||'';v.legacyPostId=v.legacyPostId||uid();
 const previous=next.posts.find(x=>x.id===v.legacyPostId)||{},post={...previous,id:v.legacyPostId,projId:record.projId,title:record.title,date:v.date||'',text:v.text||'',social:social?.id||'',status:v.legacyStatus,rubric:record.rubric||'',format:['Reels','Shorts','Видео','Клип','Выпуск'].includes(v.format)?'video':v.format==='Сторис'?'stories':'post',link:v.link||'',shootId:record.legacyShootId||previous.shootId||'',portfolioId:record.legacyPortfolioId||previous.portfolioId||''};
 next.posts=next.posts.filter(x=>x.id!==post.id);next.posts.push(post);
 }
 if(old)next.planner.topics=next.planner.topics.map(x=>x.id===record.id?record:x);else next.planner.topics.push(record);return next;
}
export function validateTopic(s,t){
 if(!t.title.trim())throw Error('Введите тему');if(!s.projects.some(x=>x.id===t.projId))throw Error('Проект не найден');
 if(!validDate(t.day))throw Error('Проверьте общий день публикации');
 for(const group of ['variants','scenes','preparation']){const ids=t[group].map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error('Повторяющиеся ID');}
 for(const v of t.variants){const old=s.posts.find(x=>x.id===v.legacyPostId),oldPlatform=s.socials.find(x=>x.id===old?.social)?.name||'Не выбрано',unchangedLegacy=old&&v.platform===oldPlatform&&v.format===legacyFormat(oldPlatform,old);if((!v.platform||v.platform==='Не выбрано')&&!unchangedLegacy)throw Error('Выберите площадку публикации');if(platforms[v.platform]&&!platforms[v.platform].includes(v.format)&&!unchangedLegacy)throw Error('Выберите формат площадки '+v.platform);if(!validDate(v.date))throw Error('Проверьте дату публикации');if(v.link&&!/^https?:\/\//i.test(v.link))throw Error('Ссылка должна начинаться с https:// или http://');}
 validateTiming(t.scenes);
 for(const x of t.scenes){if(x.status!==undefined&&!['Запланирован','Снято','Переснять'].includes(x.status))throw Error('Проверьте статус кадра');if(x.plan&&!['Общий','Средний','Крупный','Деталь'].includes(x.plan))throw Error('Проверьте план кадра');if(x.stage&&!['До','В процессе','После'].includes(x.stage))throw Error('Проверьте этап кадра');if(!x.title.trim())throw Error('Укажите, что снять в каждой сцене');if(!validDate(x.date)||!validDate(x.deadline))throw Error('Проверьте даты сцен');if(x.date&&x.deadline&&x.date>x.deadline)throw Error('Дата съёмки сцены позже крайнего срока');}
 if(!approval.includes(t.approval))throw Error('Проверьте согласование');
 if(t.preparation.some(x=>!validDate(x.deadline)))throw Error('Проверьте дедлайн подготовки');
 if(t.preparation.some(x=>!x.text?.trim()))throw Error('Введите действие подготовки или удалите пустую строку');
}
export function weekEvents(s,projId,from){const to=addDays(from,6),p=plannerState(s),topics=p.topics.filter(x=>x.projId===projId),events=[];for(const t of topics){for(const x of t.scenes){if(x.date>=from&&x.date<=to)events.push({kind:'shoot',date:x.date,title:x.title,topic:t.id,note:x.filmed?'Снято':'Снять',deadline:x.deadline,before:x.beforeWork});if(x.deadline>=from&&x.deadline<=to&&!x.filmed)events.push({kind:'deadline',date:x.deadline,title:x.title,topic:t.id,note:'Крайний срок съёмки',before:x.beforeWork});}for(const v of t.variants)if(v.date>=from&&v.date<=to)events.push({kind:'post',date:v.date,title:t.title,topic:t.id,note:v.platform+' · '+v.format+' · '+v.ready});}const shootIds=new Set(topics.flatMap(t=>[t.legacyShootId,...t.scenes.map(x=>x.shootId)]).filter(Boolean));for(const x of s.shoots.filter(x=>shootIds.has(x.id)&&x.date>=from&&x.date<=to))events.push({kind:'legacy-shoot',date:x.date,title:x.title,note:x.time||'Съёмка из прежней версии',shootId:x.id});return events;}
export function draftFromAnswers(a){
 const sections=[['ТЕМА И ЗАДАЧА',[a.problem,a.work]],['ДЛЯ КОГО И ЗАЧЕМ',[a.audience,a.goal]],['ПЛОЩАДКА И ФОРМАТ',[a.platform,a.format]],['НАЧАЛО',[a.problem]],['СЪЁМКА И КАДРЫ',[a.available,a.mustCapture]],['ПОДТВЕРЖДЁННЫЕ ФАКТЫ / РЕЗУЛЬТАТ',[a.facts]],['В КАДРЕ И РЕПЛИКИ',[a.speaker]],['ДЛИНА И ТОН',[a.length,a.tone]],['ДАТЫ',[a.shootDate?'Съёмка: '+a.shootDate:'',a.deadline?'Крайний срок: '+a.deadline:'']],['ЗАВЕРШЕНИЕ',[a.goal]]];return 'СТРУКТУРИРОВАННЫЙ ЧЕРНОВИК ПО ВАШИМ ОТВЕТАМ\n\n'+sections.map(([title,values])=>title+'\n'+(values.filter(Boolean).join('\n')||'[Дополнить вручную]')).join('\n\n');
}

