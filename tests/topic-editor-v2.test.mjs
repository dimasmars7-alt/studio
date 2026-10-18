import assert from 'node:assert/strict';
import {topicEditorV2} from '../src/topic-editor-v2.js';
import {saveTopic,importLegacy,newTopic} from '../src/planner-model.js';

const topic={id:'topic-1',projId:'project-1',title:'Рубка: демонтаж и новая обшивка',contentGoal:'Показать состояние рубки до демонтажа',taskStatus:'Подготовка',approval:'Не отправлено',rubric:'',script:'Перед нами Милена 7950.',workIds:['work-1'],folderIds:[],preparation:[],answers:{},scenes:[{id:'scene-1',title:'Рубка до работ',shots:'Снять рубку с четырёх сторон',speech:'Покажем исходное состояние',timeStart:'00:00',timeEnd:'00:12',plan:'Общий',stage:'До',status:'Запланирован',date:'2026-10-20',deadline:'2026-10-20',workIds:['work-1'],beforeWork:true,beforeNote:'Снять до демонтажа',filmed:false}],variants:[{id:'variant-1',platform:'VK',format:'Видео',title:'Рубка Милены до ремонта',text:'Показываем рубку до работ',date:'2026-10-22',ready:'Черновик',mediaIds:['file-1']} ]};
const state={orgs:[{id:'org-1',name:'Бодрый Боцман'}],projects:[{id:'project-1',orgId:'org-1',name:'Милена 7950'}],planner:{version:1,topics:[],works:[{id:'work-1',projId:'project-1',name:'Демонтаж рубки'}],folders:[]},files:[{id:'file-1',projId:'project-1',topicId:'topic-1',stage:'До',name:'Рубка.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AA=='}],rubrics:[],posts:[],socials:[],statuses:[],shoots:[]};
const ui={draft:topic,projId:'project-1',orgId:'org-1',navScope:'projects',editorTab:'topic',topicEditing:true,dirty:false};
for(const tab of ['topic','script','scenes','variants']){
 const html=topicEditorV2(state,{...ui,editorTab:tab});
 assert.match(html,/id="topic-form"/);
 assert.match(html,new RegExp('id="section-'+tab+'"'));
 assert.match(html,/Рубка: демонтаж и новая обшивка/);
}
assert.match(topicEditorV2(state,{...ui,editorTab:'scenes'}),/data-action="scene-capture"/);
assert.match(topicEditorV2(state,{...ui,editorTab:'variants',variantMediaOpen:true}),/data-variant-media="variant-1"/);
for(const tab of ['topic','script','scenes','variants'])assert.match(topicEditorV2(state,{...ui,draft:newTopic('project-1'),editorTab:tab}),/id="topic-form"/);
const saved=saveTopic(state,topic);
assert.equal(saved.posts[0].title,'Рубка Милены до ремонта');
const imported=importLegacy(saved).state;
assert.equal(imported.planner.topics[0].title,topic.title);
assert.equal(imported.planner.topics[0].variants[0].title,'Рубка Милены до ремонта');
console.log('topic editor v2 tests passed');
