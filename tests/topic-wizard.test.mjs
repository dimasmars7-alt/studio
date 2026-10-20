import assert from 'node:assert/strict';
import {topicFromWizard} from '../src/quick-create.js';
import {saveTopic} from '../src/planner-model.js';
import {topicTable} from '../src/topic-table.js';

const state={
 orgs:[{id:'org-1',name:'Бодрый Боцман'}],
 projects:[{id:'project-1',orgId:'org-1',name:'Милена 7950'}],
 planner:{version:1,topics:[],works:[{id:'work-1',projId:'project-1',name:'Демонтаж рубки'},{id:'other-work',projId:'other-project',name:'Чужая работа'}],folders:[]},
 shoots:[],posts:[],socials:[],statuses:[],rubrics:[],files:[]
};
const ui={projId:'project-1',folderId:'',tableFilter:'all',expandedTopics:[]};
const data={newTitle:'  Демонтаж рубки  ',contentGoal:'Показать состояние до работ',contentType:'Видео',taskStatus:'Подготовка',rubric:'',materialGoal:'Показать процесс',hero:'Мастер',priority:'Важный',approvalRole:'Генеральный директор',teamNote:'Снять крепления до демонтажа',shootDate:'2026-10-20',publishDate:'2026-10-22',deadline:'2026-10-19','format-Telegram':'Видео','format-YouTube':'Shorts'};
const topic=topicFromWizard(state,ui,data,['work-1','other-work','work-1'],['Telegram','YouTube','Telegram']);
assert.equal(topic.title,'Демонтаж рубки');
assert.deepEqual(topic.workIds,['work-1']);
assert.equal(topic.scenes[0].date,'2026-10-20');
assert.deepEqual(topic.scenes[0].workIds,['work-1']);
assert.equal(topic.preparation[0].deadline,'2026-10-19');
assert.deepEqual(topic.variants.map(x=>[x.platform,x.format,x.date]),[['Telegram','Видео','2026-10-22'],['YouTube','Shorts','2026-10-22']]);
assert.equal(topic.contentGoal,data.contentGoal);
assert.equal(topic.teamNote,data.teamNote);
const saved=saveTopic(state,topic);
assert.equal(saved.planner.topics.length,1);
assert.equal(saved.posts.length,2);
assert.equal(saved.planner.topics[0].priority,'Важный');
assert.match(topicTable(saved,saved.planner.topics,'',ui),/data-action="quick-create"[^>]*data-kind="topic"/);
assert.throws(()=>topicFromWizard(state,ui,{...data,newTitle:' '}),/Введите название темы/);
assert.throws(()=>topicFromWizard(state,ui,{...data,shootDate:'2026-10-40'}),/Проверьте сроки темы/);
console.log('topic wizard tests passed');
