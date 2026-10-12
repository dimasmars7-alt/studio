import assert from 'node:assert/strict';

const memory=new Map();
globalThis.localStorage={getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};
globalThis.dispatchEvent=()=>true;

localStorage.setItem('tarusov-planner-cloud-session',JSON.stringify({access_token:'access-token',refresh_token:'refresh-token',user:{id:'user-1',email:'owner@example.test'}}));

let storedSnapshot=null,remoteExists=false,requests=[];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 requests.push({url:String(url),options});
 const path=new URL(url).pathname;
 if(path.endsWith('/rpc/claim_organization'))return json('11111111-1111-4111-8111-111111111111');
 if(path.endsWith('/workspace_snapshots'))return json(remoteExists&&storedSnapshot?[{organization_id:'11111111-1111-4111-8111-111111111111',payload:storedSnapshot,schema_version:1,version:1,updated_at:new Date().toISOString()}]:[]);
 if(path.endsWith('/rpc/save_workspace_snapshot')){storedSnapshot=JSON.parse(options.body).p_payload;remoteExists=true;return json([{organization_id:'11111111-1111-4111-8111-111111111111',payload:storedSnapshot,version:1}])}
 if(path.includes('/storage/v1/object/project-media/'))return json({Key:'uploaded'});
 if(path.endsWith('/organization_members'))return json([{organization_id:'11111111-1111-4111-8111-111111111111',role:'owner',status:'active',organizations:{id:'11111111-1111-4111-8111-111111111111',name:'Бодрый Боцман'}}]);
 throw Error('Unexpected request '+url);
};

const cloud=await import('../src/cloud-sync.js?test=1');
const orgId='11111111-1111-4111-8111-111111111111',projectId='22222222-2222-4222-8222-222222222222';
const state={version:2,orgs:[{id:orgId,name:'Бодрый Боцман'}],projects:[{id:projectId,orgId,name:'Катер',archived:false}],posts:[],shoots:[],tasks:[],gear:[],portfolio:[],links:[],files:[{id:'33333333-3333-4333-8333-333333333333',projId:projectId,name:'frame.txt',type:'text/plain',size:2,data:'data:text/plain;base64,b2s='}],finances:[],profile:{name:'Тест',email:'',org:''},settings:{theme:'light',accent:'#7561df',fontSize:15,navWidth:236},rubrics:[],socials:[],statuses:[],gearCats:[],portCats:[],planner:{version:1,topics:[],works:[],folders:[]}};

const pushed=await cloud.pushCloudState(state);
assert.match(pushed.files[0].storagePath,/^11111111-1111-4111-8111-111111111111\//);
assert.equal(storedSnapshot.state.files[0].data,'');
assert.equal(storedSnapshot.state.files[0].storagePath,pushed.files[0].storagePath);
assert.ok(requests.some(item=>item.url.includes('/storage/v1/object/project-media/')));
assert.equal(cloud.cloudStatus().members[0].role,'owner');

const empty={...structuredClone(state),orgs:[],projects:[],files:[]};
const restored=await cloud.restoreCloudState(empty);
assert.equal(restored.orgs[0].name,'Бодрый Боцман');
assert.equal(restored.projects[0].name,'Катер');
assert.equal(restored.files[0].storagePath,pushed.files[0].storagePath);

localStorage.removeItem('tarusov-planner-cloud-versions');
await assert.rejects(()=>cloud.pushCloudState(state),/Сначала восстановите/);

const apiRequest=requests.find(item=>item.url.includes('/rest/v1/'));
assert.equal(apiRequest.options.headers.apikey,'sb_publishable_sYKY8BtYUk3ewdygDiMhRQ__bATXT08');
assert.equal(apiRequest.options.headers.Authorization,'Bearer access-token');
console.log('cloud sync tests passed');
