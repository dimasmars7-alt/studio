import {shotStatus} from './storyboard.js?v=20261008-topic-only7';
import {linkedShoots} from './table-records.js?v=20261008-topic-only7';
import {moscowDate,plannerState} from './planner-model.js?v=20261008-topic-only7';

export function topicNumber(s,projId,id){return plannerState(s).topics.filter(t=>t.projId===projId).findIndex(t=>t.id===id)+1;}
export const shortDate=value=>value?new Date(value+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'short',timeZone:'Europe/Moscow'}):'';
const dated=records=>records.filter(x=>x.value).sort((a,b)=>a.value.localeCompare(b.value));
export function topicMetrics(s,t,channel='',today=moscowDate()){
 const pending=t.scenes.filter(x=>shotStatus(x)!=='Снято'),filmed=t.scenes.length-pending.length,native=linkedShoots(s,t),pendingNative=native.filter(x=>x.filmed!==true&&x.status!=='Снято');
 const shootRecords=[...pending.map(x=>({id:x.id,group:'scenes',field:'date',value:x.date||''})),...pendingNative.map(x=>({id:x.id,group:'shoots',field:'date',value:x.date||''}))],shootDates=dated(shootRecords),deadlines=dated(pending.map(x=>({id:x.id,group:'scenes',field:'deadline',value:x.deadline||''}))).filter(x=>x.value<today);
 const variants=t.variants.filter(x=>!channel||x.platform===channel),unpublished=variants.filter(x=>x.ready!=='Опубликовано'),published=variants.length-unpublished.length,ready=unpublished.filter(x=>x.ready==='Готово').length,publicationRecords=unpublished.map(x=>({id:x.id,group:'variants',field:'date',value:x.date||''})),publicationDates=dated(publicationRecords);
 return {scriptLabel:t.script?.trim()?'Есть текст':'Не написан',filmed,sceneCount:t.scenes.length,pending,native,pendingNative,shootRef:shootDates[0]||shootRecords[0]||null,shootOverdue:Boolean(shootDates[0]&&shootDates[0].value<today),overdueDeadline:deadlines[0]||null,undatedShoots:shootRecords.filter(x=>!x.value).length,shootComplete:Boolean(t.scenes.length||native.length)&&!pending.length&&!pendingNative.length,critical:pending.filter(x=>x.beforeWork),variants,unpublished,published,ready,publicationRef:publicationDates[0]||publicationRecords[0]||null,publicationOverdue:Boolean(publicationDates[0]&&publicationDates[0].value<today),undatedPublications:publicationRecords.filter(x=>!x.value).length,publicationsComplete:Boolean(variants.length)&&!unpublished.length};
}

