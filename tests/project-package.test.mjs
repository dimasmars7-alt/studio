import assert from 'node:assert/strict';
import {defaults} from '../src/model.js';
import {mergeProjectPackage,readProjectPackage} from '../src/project-package.js';

const sample={type:'tarusov-project-package',version:1,organization:'Мастерская',projects:[{
 project:{id:'source-project',name:'Катер А',description:'Тестовый проект'},
 works:[{id:'source-work',projId:'source-project',name:'Ремонт корпуса',description:'Ремонт корпуса',status:'Запланировано'}],
 topics:[{id:'source-topic',projId:'source-project',title:'Осмотр корпуса',script:'Черновой сценарий',workIds:['source-work'],scenes:[{id:'source-scene',title:'Общий вид',shots:'Общий вид',workIds:['source-work'],status:'Снято',filmed:true,date:'2026-10-18',deadline:''}],variants:[{id:'source-variant',platform:'VK',format:'Видео',date:'',ready:'Черновик',text:'Текст',link:''}],preparation:[],approval:'Не отправлено',answers:{}}],
 links:[]
}]};

assert.throws(()=>readProjectPackage({}),/пакет проектов/);
const first=mergeProjectPackage(defaults(),sample);
assert.deepEqual([first.summary.projects,first.summary.works,first.summary.topics,first.summary.scenes,first.summary.variants],[1,1,1,1,1]);
const project=first.state.projects[0],work=first.state.planner.works[0],topic=first.state.planner.topics[0];
assert.equal(project.orgId,first.state.orgs[0].id);
assert.deepEqual(topic.workIds,[work.id]);
assert.deepEqual(topic.scenes[0].workIds,[work.id]);
assert.notEqual(topic.id,'source-topic');
topic.script='Правка пользователя';
const second=mergeProjectPackage(first.state,sample);
assert.deepEqual([second.summary.projects,second.summary.works,second.summary.topics,second.summary.scenes,second.summary.variants],[0,0,0,0,0]);
assert.equal(second.state.planner.topics[0].script,'Правка пользователя');
console.log('project package tests passed');
