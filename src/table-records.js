import {shotStatus} from './storyboard.js?v=20261008-topic-only7';
import {plannerState,saveTopic,validDate} from './planner-model.js?v=20261008-topic-only7';

export function linkedShoots(s,t){
 const ids=new Set([t.legacyShootId,...t.scenes.map(x=>x.shootId)].filter(Boolean));
 const represented=new Set(t.scenes.filter(x=>x.date).map(x=>x.shootId).filter(Boolean));
 return s.shoots.filter(x=>ids.has(x.id)&&!represented.has(x.id)&&(!x.projId||x.projId===t.projId));
}
export function ungroupedShoots(s,projId){
 const ids=new Set(plannerState(s).topics.flatMap(t=>[t.legacyShootId,...t.scenes.map(x=>x.shootId)]).filter(Boolean));
 return s.shoots.filter(x=>x.projId===projId&&!ids.has(x.id));
}
export function nextAction(t){
 const pending=t.scenes.filter(x=>shotStatus(x)!=='Снято'),prep=t.preparation.filter(x=>!x.done),unpublished=t.variants.filter(v=>v.ready!=='Опубликовано');
 const critical=pending.filter(x=>x.beforeWork);
 if(critical.length)return {label:'Снять до начала работы',tab:'scenes',note:'Критичных сцен: '+critical.length+' · '+critical.map(x=>x.title).join(', '),critical:true};
 if(t.variants.length&&!unpublished.length)return {label:'Публикации завершены',note:'Все заданные варианты отмечены как опубликованные',done:true};
 if(prep.length)return {label:'Завершить подготовку',tab:'topic',note:prep.length+' невыполненных действий'};
 if(!t.script?.trim())return {label:'Написать сценарий',tab:'script',note:'Общий текст ещё не заполнен'};
 const video=!t.variants.length||t.variants.some(v=>['Reels','Shorts','Видео','Клип','Выпуск'].includes(v.format));
 if(!t.scenes.length&&video)return {label:'Добавить сцены',tab:'scenes',note:'Для видео ещё нет плана съёмки'};
 if(pending.some(x=>!x.date))return {label:'Назначить съёмку',tab:'scenes',note:'Есть неснятые сцены без даты'};
 if(pending.length)return {label:'Отметить снятые кадры',tab:'scenes',note:pending.length+' сцен ожидают съёмки'};
 if(!t.variants.length||unpublished.some(v=>!v.date))return {label:'Запланировать публикацию',tab:'variants',note:'Укажите дату конкретной площадки'};
 if(unpublished.length&&t.approval==='Нужны правки')return {label:'Внести правки',tab:'topic',note:t.approvalNote||'Сценарий или материал требует правок'};
 if(unpublished.some(v=>v.ready!=='Готово'))return {label:'Подготовить публикации',tab:'variants',note:'Есть публикации в черновике'};
 if(unpublished.length&&t.approval!=='Согласовано')return {label:t.approval==='На согласовании'?'Проверить согласование':'Отметить согласование',tab:'topic',note:t.approval==='На согласовании'?'Материал ожидает ответа':'Согласование ещё не отмечено'};
 if(unpublished.length)return {label:'Отметить публикацию',tab:'variants',note:'После размещения отметьте «Опубликовано»'};
 return {label:'Публикации завершены',note:'Все заданные публикации отмечены как опубликованные',done:true};
}
export function changeTableDate(s,projId,edit,value){
 if(!validDate(value))throw Error('Укажите корректную дату');
 if(edit.group==='shoots'){
  const x=s.shoots.find(x=>x.id===edit.id);
  const t=edit.topic?plannerState(s).topics.find(t=>t.id===edit.topic&&t.projId===projId):null;
  if(edit.field!=='date'||!x||!(t?linkedShoots(s,t).some(v=>v.id===x.id):ungroupedShoots(s,projId).some(v=>v.id===x.id)))throw Error('Съёмка не найдена в этом проекте');
  if((x.date||'')!==edit.original)throw Error('Дата уже изменилась. Откройте её заново');
  const next=structuredClone(s);next.shoots.find(v=>v.id===x.id).date=value;return next;
 }
 const allowed={scenes:['date','deadline'],variants:['date'],preparation:['deadline']};
 if(!allowed[edit.group]?.includes(edit.field))throw Error('Недопустимое поле даты');
 const topic=plannerState(s).topics.find(t=>t.id===edit.topic&&t.projId===projId),record=topic?.[edit.group].find(x=>x.id===edit.id);
 if(!record)throw Error('Запись не найдена в этом проекте');
 if((record[edit.field]||'')!==edit.original)throw Error('Дата уже изменилась. Откройте её заново');
 const copy=structuredClone(topic);copy[edit.group].find(x=>x.id===edit.id)[edit.field]=value;
 return saveTopic(s,copy);
}

