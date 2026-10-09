import {cloudConfig,cloudConfigured} from './cloud-config.js';

const sessionKey='tarusov-planner-cloud-session';
let session=readSession();

function readSession(){
 try{
  const value=JSON.parse(localStorage.getItem(sessionKey)||'null');
  return value&&typeof value.access_token==='string'&&typeof value.refresh_token==='string'?value:null;
 }catch{return null;}
}

function saveSession(value){
 session=value||null;
 if(session)localStorage.setItem(sessionKey,JSON.stringify(session));
 else localStorage.removeItem(sessionKey);
 dispatchEvent(new CustomEvent('planner-cloud-auth',{detail:authState()}));
}

function requireConfig(){
 if(!cloudConfigured())throw Error('Облачное хранилище ещё не подключено');
}

async function parse(response){
 const text=await response.text();
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{data=text;}
 if(!response.ok){
  const message=data?.message||data?.msg||data?.error_description||data?.error||('Ошибка облака: '+response.status);
  const error=Error(message);error.status=response.status;error.code=data?.code||'';throw error;
 }
 return data;
}

async function authRequest(path,options={}){
 requireConfig();
 return parse(await fetch(cloudConfig.supabaseUrl+'/auth/v1/'+path,{
  ...options,
  headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json',...(options.headers||{})}
 }));
}

export function authState(){
 return {configured:cloudConfigured(),signedIn:Boolean(session?.access_token),user:session?.user||null};
}

export async function signIn(email,password){
 const result=await authRequest('token?grant_type=password',{method:'POST',body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})});
 saveSession(result);return authState();
}

export async function refreshSession(){
 if(!session?.refresh_token)return null;
 try{
  const result=await authRequest('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
  saveSession(result);return result;
 }catch(error){saveSession(null);throw error;}
}

export async function signOut(){
 if(session?.access_token){
  try{await authRequest('logout',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});}catch{}
 }
 saveSession(null);
}

async function api(path,options={},retry=true){
 requireConfig();
 if(!session?.access_token)throw Error('Войдите в облачное хранилище');
 const binary=options.body instanceof Blob;
 const response=await fetch(cloudConfig.supabaseUrl+path,{
  ...options,
  headers:{apikey:cloudConfig.publishableKey,Authorization:'Bearer '+session.access_token,...(binary?{}:{'Content-Type':'application/json'}),...(options.headers||{})}
 });
 if(response.status===401&&retry&&session?.refresh_token){await refreshSession();return api(path,options,false);}
 return parse(response);
}

export async function listOrganizations(){
 return api('/rest/v1/organization_members?select=organization_id,role,status,organizations(id,name)&status=eq.active&order=created_at.asc');
}

export async function claimOrganization(id,name){
 return api('/rest/v1/rpc/claim_organization',{method:'POST',body:JSON.stringify({p_organization_id:id,p_name:name})});
}

export async function loadSnapshot(organizationId){
 const rows=await api('/rest/v1/workspace_snapshots?select=organization_id,payload,schema_version,version,updated_at&organization_id=eq.'+encodeURIComponent(organizationId));
 return rows?.[0]||null;
}

export async function saveSnapshot(organizationId,payload,expectedVersion=0){
 return api('/rest/v1/rpc/save_workspace_snapshot',{method:'POST',body:JSON.stringify({p_organization_id:organizationId,p_payload:payload,p_expected_version:expectedVersion})});
}

export async function uploadMedia(path,file){
 if(!(file instanceof Blob))throw Error('Файл не выбран');
 return api('/storage/v1/object/project-media/'+path.split('/').map(encodeURIComponent).join('/'),{
  method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'}
 });
}

export async function createSignedMediaUrl(path,expiresIn=900){
 return api('/storage/v1/object/sign/project-media/'+path.split('/').map(encodeURIComponent).join('/'),{
  method:'POST',body:JSON.stringify({expiresIn:Math.max(60,Math.min(3600,Number(expiresIn)||900))})
 });
}
