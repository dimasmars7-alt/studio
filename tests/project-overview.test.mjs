import assert from 'node:assert/strict';
import {projectOverview} from '../src/project-overview.js';

const state={
 orgs:[{id:'org-1',name:'Бодрый Боцман'}],
 projects:[{id:'project-1',orgId:'org-1',name:'Катер Север'}],
 shoots:[],rubrics:[],files:[],posts:[],socials:[],statuses:[],
 planner:{version:1,works:[],folders:[],topics:[{
  id:'topic-1',projId:'project-1',title:'Повреждения корпуса',script:'Текст',rubric:'',workIds:[],preparation:[],approval:'Не отправлено',answers:{},
  scenes:[{id:'scene-1',title:'Крупный план сколов',shots:'Снять повреждения',plan:'Крупный',status:'Запланирован',date:'2099-10-14',deadline:'2099-10-14',workIds:[]}],
  variants:[{id:'variant-1',platform:'VK',format:'Видео',text:'',date:'2099-10-16',ready:'Черновик'}]
 }]}
};
const ui={projId:'project-1',channel:'',expandedTopics:[]};
const html=projectOverview(state,ui,state.planner.topics,'<div id="table">Таблица</div>');
assert.match(html,/Ближайшая съёмка/);
assert.match(html,/Повреждения корпуса/);
assert.match(html,/Ближайшие темы/);
assert.match(html,/Ближайшие 7 дней/);
assert.match(html,/Важные кадры/);
assert.match(html,/data-action="topic-open"/);
assert.match(html,/id="table"/);
assert.match(html,/Работы ещё не добавлены/);
assert.doesNotMatch(html,/Демонтаж рубки/);

const another=structuredClone(state);
another.projects.push({id:'project-2',orgId:'org-1',name:'Другой катер'});
another.planner.works.push(
 {id:'work-1',projId:'project-1',name:'Ремонт корпуса',status:'Выполнено',startDate:'2099-10-10'},
 {id:'work-2',projId:'project-1',name:'Покраска борта',status:'Запланировано',startDate:'2099-10-12'},
 {id:'work-3',projId:'project-2',name:'Перешивка салона',status:'В работе',startDate:'2099-10-11'}
);
const firstProject=projectOverview(another,ui,another.planner.topics,'');
assert.match(firstProject,/Ремонт корпуса/);
assert.match(firstProject,/Покраска борта/);
assert.match(firstProject,/1 из 2 выполнено/);
assert.match(firstProject,/50%/);
assert.doesNotMatch(firstProject,/Перешивка салона/);
const secondProject=projectOverview(another,{...ui,projId:'project-2'},[],'');
assert.match(secondProject,/Перешивка салона/);
assert.match(secondProject,/В работе/);
assert.match(secondProject,/Создать первую тему/);
assert.match(secondProject,/Добавить тему/);
assert.doesNotMatch(secondProject,/Ремонт корпуса/);
assert.doesNotMatch(secondProject,/Покраска борта/);
const many=structuredClone(another);
many.planner.works=many.planner.works.filter(x=>x.projId==='project-2');
many.planner.works.push(...Array.from({length:8},(_,i)=>({id:'stage-'+i,projId:'project-1',name:'Этап '+(i+1),status:i<6?'Выполнено':'Запланировано'})));
const laterStage=projectOverview(many,ui,[],'');
assert.match(laterStage,/Этап 7/);
assert.match(laterStage,/Показаны работы 4–8 из 8/);
console.log('project overview tests passed');
