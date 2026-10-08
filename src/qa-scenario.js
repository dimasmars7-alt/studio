import {escape as e,field,button as b} from './ui.js?v=20261008-single-plan8';
import {platforms,plannerState,validDate} from './planner-model.js?v=20261008-single-plan8';
import {speakers,appendPlan} from './scenario-plan.js?v=20261008-single-plan8';
import {uid} from './model.js?v=20261008-single-plan8';
import {timecode,validateSequence,timingLabel} from './scene-timing.js?v=20261008-single-plan8';

export const questionTitles=['О чём видео и зачем?','Где выйдет материал?','Что известно о работе?','Для кого это видео?','Что можно показать?','Кто будет говорить?','Какой длины и в каком тоне?','Чем завершить видео?','Проверка перед генерацией'];
export function initializeQuestions(t){
 t.aiBrief={...(t.answers||{}),...(t.aiBrief||{})};const a=t.aiBrief;
 a.topic=t.title||a.topic||'';a.platform=a.platform||t.variants[0]?.platform||'';a.format=a.format||t.variants[0]?.format||'';
 a.speakerMode=a.speakerMode||'host';a.durationSeconds=a.durationSeconds||60;
 return t;
}
export function validateQuestions(t,step=8){
 const a=t.aiBrief||{};
 if((step===0||step===8)&&(!t.title?.trim()||!a.goal?.trim()))throw Error('Укажите тему и цель видео');
 if((step===1||step===8)&&(!platforms[a.platform]?.includes(a.format)))throw Error('Выберите площадку и формат');
 if((step===6||step===8)&&(!Number.isInteger(Number(a.durationSeconds))||Number(a.durationSeconds)<10||Number(a.durationSeconds)>3600))throw Error('Длительность: целое число от 10 до 3600 секунд');
 if(step===8&&(!validDate(a.shootDate)||!validDate(a.deadline)||a.shootDate&&a.deadline&&a.shootDate>a.deadline))throw Error('Проверьте отдельные календарные даты съёмки');
}
export function requestBrief(s,t){validateQuestions(t);const a=t.aiBrief,works=plannerState(s).works.filter(w=>w.projId===t.projId&&t.workIds.includes(w.id));return {...Object.fromEntries(['goal','platform','format','problem','facts','audience','available','mustCapture','beforeWork','speakerMode','speaker','tone','ending','shootDate','deadline'].map(k=>[k,String(a[k]||'')])),topic:t.title,project:s.projects.find(x=>x.id===t.projId)?.name||'',works:works.map(w=>w.name+(w.description?' — '+w.description:'')).join('\n'),durationSeconds:Number(a.durationSeconds)};}
export async function aiConnection(signal){try{const r=await fetch('/api/scenario/status',{cache:'no-store',signal});if(!r.ok)throw Error();const x=await r.json();if(typeof x.ready!=='boolean'||!x.token)throw Error();return x;}catch{return {ready:false,message:'AI не подключён. Нужен локальный AI-сервер с настроенными OpenAI API, ключом и моделью.'};}}
export async function generateScenario(brief,connection,requestId,signal){
 if(!connection.ready)throw Error('AI не подключён');
 const r=await fetch('/api/scenario/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Scenario-Token':connection.token},body:JSON.stringify({brief,requestId}),signal});let x;try{x=await r.json()}catch{throw Error('AI-сервер вернул непонятный ответ')}
 if(!r.ok){const err=Error(typeof x.error==='string'?x.error:'Не удалось создать сценарий');err.status=r.status;throw err;}
 return {script:x.result?.script,scenes:x.result?.scenes,clarifications:x.result?.clarifications,provider:x.provider,model:x.model};
}
export function resultScenes(result,t){
 if(typeof result.script!=='string'||!result.script.trim()||!Array.isArray(result.scenes)||!result.scenes.length||result.scenes.length>40)throw Error('AI вернул неполный сценарий');
 let end=0;const mode=t.aiBrief.speakerMode;
 const scenes=result.scenes.map(x=>{
  if(!Number.isInteger(x.startSeconds)||!Number.isInteger(x.endSeconds)||x.startSeconds!==end||x.endSeconds<=end||x.endSeconds>Number(t.aiBrief.durationSeconds)||!x.title?.trim()||!['Общий','Средний','Крупный','Деталь'].includes(x.plan))throw Error('Некорректные сцены или тайминги AI');
  for(const k of ['title','action','speech','voiceOver','audio','overlay'])if(typeof x[k]!=='string')throw Error('Неполная сцена AI');
  if(mode==='silent'&&(x.speech||x.voiceOver)||mode==='host'&&x.voiceOver||mode==='voiceover'&&x.speech)throw Error('AI нарушил выбранный режим речи');
  if(x.beforeWork&&!t.aiBrief.beforeWork?.trim())throw Error('Кадр до работ не подтверждён вводными');
  end=x.endSeconds;
  return {id:uid(),title:x.title,shots:x.action,plan:x.plan,timeStart:timecode(x.startSeconds),timeEnd:timecode(x.endSeconds),speech:x.speech,voiceOver:x.voiceOver,broll:'',audio:x.audio,overlay:x.overlay,speakerMode:mode,timingApproximate:true,speechDraft:true,date:t.aiBrief.shootDate||'',deadline:t.aiBrief.deadline||'',status:'Запланирован',filmed:false,beforeWork:Boolean(x.beforeWork),beforeNote:x.beforeWork?t.aiBrief.beforeWork:'',workIds:[...t.workIds],storyboardFileId:''};
 });if(end!==Number(t.aiBrief.durationSeconds))throw Error('AI вернул другую длительность');validateSequence(scenes);return scenes;
}
export function acceptScenario(t,result,mode){
 const copy=structuredClone(t),scenes=resultScenes(result,t),hasContent=Boolean(t.script?.trim()||t.scenes.length);
 if(hasContent&&!['replace','append'].includes(mode))throw Error('Выберите, как применить результат к существующему сценарию');
 if(mode==='append'){if(copy.scenes.length)validateSequence(copy.scenes);copy.script+=(copy.script?'\n\n':'')+result.script;copy.scenes=appendPlan(copy.scenes,scenes);}
 else{copy.script=result.script;copy.scenes=scenes;}
 copy.aiGeneration={provider:result.provider,model:result.model,generatedAt:new Date().toISOString(),clarifications:result.clarifications||[]};return copy;
}
export function questionView(s,u){
 const t=u.draft,a=t.aiBrief||{},step=u.wizardStep||0,status=u.aiConnection||{ready:false,message:'Проверяем подключение AI…'},f=(k,label,type='textarea',required=false)=>field('qa-'+k,label,k==='topic'?t.title:a[k]||'',type,null,required),works=plannerState(s).works.filter(w=>w.projId===t.projId);
 let body='';
 if(step===0)body=f('topic','Тема видео','textarea',true)+f('goal','Что зритель должен понять или сделать?','textarea',true);
 if(step===1)body=field('qa-platform','Площадка',a.platform||'','text',[['','Выберите'],...Object.keys(platforms).map(x=>[x,x])],true)+(a.platform?field('qa-format','Формат',a.format||'','text',[['','Выберите'],...(platforms[a.platform]||[]).map(x=>[x,x])],true):'')+'<p class="small-note">Вводные для '+e(a.format||'выбранного формата')+' будут переданы AI. Для короткого видео — одна мысль, для выпуска — развёрнутый рассказ.</p>';
 if(step===2)body=f('problem','Состояние лодки и задача ремонта (необязательно)')+f('facts','Подтверждённые факты: что уже сделано, что известно (необязательно)')+'<details><summary>Связанные работы проекта · '+t.workIds.length+'</summary>'+works.map(w=>'<label class="checkbox-line"><input type="checkbox" data-qa-work="'+e(w.id)+'" '+(t.workIds.includes(w.id)?'checked':'')+'>'+e(w.name)+'</label>').join('')+'</details><p class="small-note">Неизвестное оставьте пустым: AI должен отметить уточнения, а не придумывать результаты.</p>';
 if(step===3)body=f('audience','Кто будет смотреть и что ему уже известно? (необязательно)');
 if(step===4)body=f('available','Какие кадры уже есть или доступны сейчас? (необязательно)')+f('beforeWork','Что обязательно снять до начала работ? (необязательно)')+'<details><summary>Дополнительные обязательные кадры</summary>'+f('mustCapture','Что ещё нельзя пропустить?')+'</details>';
 if(step===5)body=field('qa-speakerMode','Режим речи',a.speakerMode||'host','text',speakers)+(a.speakerMode==='silent'?'<p>AI подготовит действия, титры и звук без речи.</p>':f('speaker',a.speakerMode==='voiceover'?'Кто озвучивает? (необязательно)':'Кто ведущий? (необязательно)','text'));
 if(step===6)body=f('durationSeconds','Желаемая длительность видео, секунд','number',true)+f('tone','Тон: например, спокойно и понятно (необязательно)','text')+'<p class="small-note">Это тайминг внутри видео. Он не назначает дату съёмки.</p>';
 if(step===7)body=f('ending','Как завершить видео? Призыв или следующий шаг (необязательно)')+'<details><summary>Календарные даты съёмки (необязательно)</summary><div class="field-pair">'+f('shootDate','Дата съёмки','date')+f('deadline','Крайний срок съёмки','date')+'</div><p class="small-note">Эти даты будут применены только к новым сценам из принимаемого результата.</p></details>';
 if(step===8){let brief;try{brief=requestBrief(s,t)}catch(err){brief={Ошибка:err.message}}body='<dl class="qa-review">'+Object.entries(brief).filter(([,v])=>v).map(([k,v])=>'<div><dt>'+e(({topic:'Тема',goal:'Цель',project:'Проект',platform:'Площадка',format:'Формат',problem:'Состояние и задача',facts:'Факты',audience:'Аудитория',available:'Доступные кадры',mustCapture:'Обязательные кадры',beforeWork:'До работ',speakerMode:'Режим речи',speaker:'Говорящий',tone:'Тон',ending:'Завершение',durationSeconds:'Длительность, сек.',shootDate:'Дата съёмки',deadline:'Крайний срок',works:'Работы'})[k]||k)+'</dt><dd>'+e(k==='speakerMode'?speakers.find(([mode])=>mode===brief.speakerMode)?.[1]||v:v)+'</dd></div>').join('')+'</dl><p class="qa-connection" role="status">'+e(status.message)+'</p>'+(status.ready?'<p class="small-note">По нажатию вводные выше будут переданы в OpenAI API · '+e(status.model)+'. Файлы и остальные материалы проекта не отправляются. Вызов оплачивается в вашем API-аккаунте.</p>':'')+b('qa-generate',u.aiLoading?'AI пишет сценарий…':'Сгенерировать сценарий и раскадровку',!status.ready||u.aiLoading?'disabled':'','primary')+(u.aiLoading?b('qa-stop','Прекратить ожидание')+'<p class="small-note">Прекращение ожидания не гарантирует отмену уже отправленного запроса OpenAI.</p>':'')+(u.aiError?'<p class="qa-error" role="alert">'+e(u.aiError)+'</p>':'');}
 if(u.aiResult){const result=u.aiResult;body+='<section class="qa-result"><h3>Предпросмотр · результат ещё не сохранён</h3><label class="field">Текст сценария<textarea data-ai-result-script>'+e(result.script)+'</textarea></label>'+(result.clarifications?.length?'<p class="qa-error">Уточнить: '+e(result.clarifications.join(' · '))+'</p>':'')+result.scenes.map((x,i)=>'<article class="qa-scene"><strong>'+(i+1)+'. '+e(timecode(x.startSeconds))+' — '+e(timecode(x.endSeconds))+' · '+(x.endSeconds-x.startSeconds)+' сек.</strong><p>'+e(x.title)+' · '+e(x.plan)+'</p><p>'+e(x.action)+'</p><p>'+e(x.speech||x.voiceOver||'Без речи')+'</p></article>').join('')+(t.script?.trim()||t.scenes.length?field('qa-applyMode','Как применить к существующему сценарию?',a.applyMode||'','text',[['','Выберите действие'],['append','Добавить после существующего текста и сцен'],['replace','Заменить общий текст и сцены']]):'')+b('qa-accept','Принять в черновик','','primary')+'<p class="small-note">После принятия можно поправить сцены и текст. Для записи нажмите «Сохранить материал».</p></section>';}
 return '<form id="topic-form" class="topic-editor spacious-editor tabbed-editor qa-editor"><header><div><span class="small-note">'+e(s.projects.find(x=>x.id===t.projId)?.name||'Проект')+' / '+e(t.title||'Новый сценарий')+'</span><h2>'+questionTitles[step]+'</h2></div>'+b('wizard-close','К редактору')+'</header><p class="qa-progress">Шаг '+(step+1)+' из '+questionTitles.length+' · ответы остаются в черновике</p><div class="editor-body"><section class="tabbed-panel">'+body+'</section></div><footer><span class="save-note">'+(u.aiLoading?'Ожидаем ответ OpenAI':u.dirty?'Есть несохранённые вводные':'Сначала вводные, затем AI и проверка')+'</span>'+b('qa-save-brief','Сохранить вводные',u.aiLoading?'disabled':'')+b(step?'qa-back':'wizard-close',step?'Назад':'К редактору',u.aiLoading?'disabled':'')+(step<8?b('qa-next','Далее','','primary'):'')+'</footer></form>';
}
