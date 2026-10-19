import {cloudConfigured} from './cloud-config.js';
import {authState,signIn,signUp,signOut,refreshSession,listOrganizations,claimOrganization,loadSnapshot,saveSnapshot,uploadMedia,createSignedMediaUrl,getProfile,updateProfile} from './cloud-client.js';
import {organizationSnapshot,mergeOrganizationSnapshot} from './cloud-state.js';
import {normalize} from './model.js?v=20261012-cloud1';

const mapKey='tarusov-planner-cloud-organizations';
const versionKey='tarusov-planner-cloud-versions';
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let runtime={phase:'idle',message:'',lastSync:'',members:[],profile:null},timer=null;
const mediaUrls=new Map();

function readObject(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
function writeObject(key,value){localStorage.setItem(key,JSON.stringify(value))}
function update(patch){runtime={...runtime,...patch};dispatchEvent(new CustomEvent('planner-cloud-sync',{detail:cloudStatus()}));}
function savedRow(value){return Array.isArray(value)?value[0]:value}
function cloudOrganizationId(localId){const map=readObject(mapKey);if(map[localId])return map[localId];map[localId]=uuidPattern.test(localId)?localId:crypto.randomUUID();writeObject(mapKey,map);return map[localId]}
function rememberOrganization(localId,cloudId){const map=readObject(mapKey);map[localId]=cloudId;writeObject(mapKey,map)}
function filePath(cloudId,file){const clean=String(file.name||'file').replace(/[\\/\u0000-\u001f]/g,'_').slice(-160);return [cloudId,file.projId,file.id,clean].join('/')}
function dataBlob(value,type){const match=String(value||'').match(/^data:([^;,]+)(?:;[^;,]+)*;base64,(.*)$/s);if(!match)throw Error('Файл не удалось подготовить для облака');const raw=atob(match[2]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:type||match[1]||'application/octet-stream'})}

export function cloudStatus(){const auth=authState();return {...auth,...runtime,configured:cloudConfigured(),mappedCount:Object.keys(readObject(mapKey)).length}}
async function loadAccount(){runtime.members=await listOrganizations();try{runtime.profile=await getProfile()}catch{runtime.profile=null}}
export async function cloudInitialize(){if(!cloudConfigured())return cloudStatus();if(authState().signedIn){try{await refreshSession();await loadAccount()}catch(error){update({phase:'error',message:error.message})}}return cloudStatus()}
export async function cloudSignIn(email,password){update({phase:'working',message:'Входим…'});try{const result=await signIn(email,password);await loadAccount();update({phase:'ready',message:runtime.profile?'Вход выполнен':'Вход выполнен. Профиль Supabase пока недоступен'});return result}catch(error){update({phase:'error',message:error.message});throw error}}
export async function cloudSignUp(email,password,displayName=''){update({phase:'working',message:'Создаём аккаунт…'});try{const result=await signUp(email,password,displayName);if(result.state.signedIn)await loadAccount();update({phase:result.confirmationRequired?'notice':'ready',message:result.confirmationRequired?'Подтвердите адрес по письму Supabase':'Аккаунт создан'});return result}catch(error){update({phase:'error',message:error.message});throw error}}
export async function cloudSaveProfile(displayName){const profile=await updateProfile(displayName);update({profile,message:'Имя сохранено'});return profile}
export async function cloudSignOut(){await signOut();runtime={phase:'idle',message:'Вы вышли из облака',lastSync:'',members:[],profile:null};dispatchEvent(new CustomEvent('planner-cloud-sync',{detail:cloudStatus()}));}

async function uploadSnapshotFiles(next,envelope,cloudId){
 for(const copy of envelope.state.files||[]){
  const local=next.files.find(file=>file.id===copy.id);
  if(!local)continue;
  if(!local.storagePath&&/^data:[^,]+;base64,/i.test(local.data||'')){
   const path=filePath(cloudId,local);
   try{await uploadMedia(path,dataBlob(local.data,local.type))}catch(error){if(![400,409].includes(error.status))throw error}
   local.storagePath=path;copy.storagePath=path;
  }
  if(local.storagePath)copy.storagePath=local.storagePath;
  copy.data='';
 }
}

export async function pushCloudState(input){
 if(!authState().signedIn)throw Error('Сначала войдите в облако');
 if(!input.orgs.length)throw Error('Сначала добавьте организацию');
 update({phase:'working',message:'Сохраняем данные в облако…'});
 const next=structuredClone(input),versions=readObject(versionKey);
 try{
  for(const org of next.orgs){
   const cloudId=cloudOrganizationId(org.id);await claimOrganization(cloudId,org.name);
   const remote=await loadSnapshot(cloudId),known=versions[cloudId];
   if(remote&&known===undefined)throw Error('В облаке уже есть данные этой организации. Сначала восстановите их, чтобы не затереть изменения.');
   const envelope=organizationSnapshot(next,org.id);await uploadSnapshotFiles(next,envelope,cloudId);
   const saved=savedRow(await saveSnapshot(cloudId,envelope,remote?Number(known):0));
   versions[cloudId]=Number(saved?.version||remote?.version||1);rememberOrganization(org.id,cloudId);
  }
  writeObject(versionKey,versions);runtime.members=await listOrganizations();const lastSync=new Date().toISOString();update({phase:'ready',message:'Данные синхронизированы',lastSync});return normalize(next);
 }catch(error){update({phase:'error',message:error.code==='40001'?'Конфликт версий: сначала восстановите свежие данные из облака':error.message});throw error}
}

export async function restoreCloudState(input){
 if(!authState().signedIn)throw Error('Сначала войдите в облако');
 update({phase:'working',message:'Восстанавливаем данные…'});
 try{
  const rows=await listOrganizations(),versions=readObject(versionKey),map=readObject(mapKey);let next=structuredClone(input),restored=0;
  for(const row of rows||[]){
   const cloudId=row.organization_id,remote=await loadSnapshot(cloudId);if(!remote?.payload)continue;
   next=mergeOrganizationSnapshot(next,remote.payload);const localId=remote.payload.organizationId||remote.payload.state?.orgs?.[0]?.id;if(localId)map[localId]=cloudId;
   versions[cloudId]=Number(remote.version||1);restored++;
  }
  if(!restored)throw Error('В облаке пока нет сохранённых данных');
  writeObject(mapKey,map);writeObject(versionKey,versions);runtime.members=rows;const lastSync=new Date().toISOString();update({phase:'ready',message:'Данные восстановлены из облака',lastSync});return normalize(next);
 }catch(error){update({phase:'error',message:error.message});throw error}
}

export function queueCloudSync(state,onUpdated){
 if(!authState().signedIn||!Object.keys(readObject(mapKey)).length)return;
 clearTimeout(timer);const snapshot=structuredClone(state);timer=setTimeout(()=>pushCloudState(snapshot).then(onUpdated).catch(()=>{}),900);
}

export async function resolveCloudMediaUrl(file){
 if(file?.data)return file.data;if(!file?.storagePath)throw Error('Файл недоступен');
 const cached=mediaUrls.get(file.storagePath);if(cached?.expires>Date.now())return cached.url;
 const result=await createSignedMediaUrl(file.storagePath,900),url=result?.signedURL||result?.signedUrl;if(!url)throw Error('Не удалось открыть облачный файл');
 const absolute=/^https?:/i.test(url)?url:new URL(url,cloudStatus().configured?'https://kdxxetrfxpwgzatostfa.supabase.co':'').href;mediaUrls.set(file.storagePath,{url:absolute,expires:Date.now()+12*60*1000});return absolute;
}

export function hydrateCloudImages(root,state){
 root.querySelectorAll('[data-cloud-file]').forEach(node=>{const file=state.files.find(item=>item.id===node.dataset.cloudFile);if(!file||node.dataset.cloudLoading)return;node.dataset.cloudLoading='1';resolveCloudMediaUrl(file).then(url=>{node.src=url;node.hidden=false}).catch(()=>{node.hidden=true})});
}
