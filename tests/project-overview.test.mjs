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
assert.match(html,/План контента/);
assert.match(html,/План на 7 дней/);
assert.match(html,/data-action="topic-open"/);
assert.match(html,/id="table"/);
console.log('project overview tests passed');
