import assert from 'node:assert/strict';

globalThis.localStorage={getItem:()=>null};
const token='11111111-1111-4111-8111-111111111111';
const calls=[];
globalThis.fetch=async(url,options)=>{
 calls.push({url:String(url),options});
 return new Response(JSON.stringify({organization:'Бодрый Боцман',projects:[{id:'boat-1',name:'Катер',description:'Ремонт',topics:[{title:'Обзор'}]}]}),{status:200,headers:{'content-type':'application/json'}});
};

const {getPublicCatalog}=await import('../src/cloud-client.js?public-catalog-test');
await assert.rejects(()=>getPublicCatalog('bad-token'),/Некорректная публичная ссылка/);
assert.equal(calls.length,0);
const catalog=await getPublicCatalog(token);
assert.equal(catalog.projects[0].topics[0].title,'Обзор');
assert.match(calls[0].url,/\/rest\/v1\/rpc\/get_public_catalog$/);
assert.equal(calls[0].options.headers.Authorization,undefined);
assert.equal(JSON.parse(calls[0].options.body).p_share_token,token);
console.log('public catalog tests passed');
