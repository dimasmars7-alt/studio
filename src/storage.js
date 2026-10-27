import {defaults,normalize} from './model.js?v=20261012-cloud1';
let db;
export async function openStore(){
 db=await new Promise((resolve,reject)=>{
 const request=indexedDB.open('studio-workspace',2);
 request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains('state'))database.createObjectStore('state');if(!database.objectStoreNames.contains('backups'))database.createObjectStore('backups');};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
 request.onblocked=()=>reject(Error('Закройте другие вкладки студии и повторите загрузку'));
 });
 db.onversionchange=()=>db.close();
 const saved=await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 if(saved){const state=normalize(saved);if(JSON.stringify(state.projects)!==JSON.stringify(saved.projects))await persist(state);return {state,migrated:false};}
 const legacy=localStorage.getItem('studio');
 if(legacy){const state=normalize(JSON.parse(legacy));await persist(state);return {state,migrated:true}}
 const state=defaults();await persist(state);return {state,migrated:false};
}
export function persist(state){
 return new Promise((resolve,reject)=>{
 const tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'current');
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Не удалось сохранить данные'));
 });
}

export function backupState(state,reason='Перед изменением'){
 return new Promise((resolve,reject)=>{
  if(!db||!db.objectStoreNames.contains('backups'))return resolve();
  const tx=db.transaction('backups','readwrite'),key=Date.now();
  tx.objectStore('backups').put({state:structuredClone(state),reason,createdAt:new Date(key).toISOString()},key);
  tx.oncomplete=()=>resolve(key);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Не удалось создать резервную копию'));
 });
}
