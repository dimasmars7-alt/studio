import assert from 'node:assert/strict';

const memory=new Map(),requests=[];
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};
globalThis.dispatchEvent=()=>true;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 requests.push({url:String(url),options});
 const path=new URL(url).pathname;
 if(path==='/auth/v1/signup')return json({user:{id:'owner-1',email:'owner@example.test'}});
 if(path==='/auth/v1/token')return json({access_token:'access',refresh_token:'refresh',user:{id:'owner-1',email:'owner@example.test'}});
 if(path==='/rest/v1/profiles')return options.method==='PATCH'?json([{id:'owner-1',display_name:'Дмитрий Тарусов'}]):json([{id:'owner-1',display_name:'Дмитрий'}]);
 throw Error('Unexpected request '+url);
};

const client=await import('../src/cloud-client.js?account-test=1');
const signup=await client.signUp('owner@example.test','safe-password','Дмитрий Тарусов');
assert.equal(signup.confirmationRequired,true);
assert.equal(JSON.parse(requests[0].options.body).data.display_name,'Дмитрий Тарусов');
await client.signIn('owner@example.test','safe-password');
assert.equal((await client.getProfile()).display_name,'Дмитрий');
assert.equal((await client.updateProfile(' Дмитрий Тарусов ')).display_name,'Дмитрий Тарусов');
const save=requests.find(item=>item.options.method==='PATCH');
assert.equal(JSON.parse(save.options.body).display_name,'Дмитрий Тарусов');
assert.equal(save.options.headers.Authorization,'Bearer access');
await assert.rejects(()=>client.updateProfile('x'),/имя/i);
console.log('cloud account tests passed');
