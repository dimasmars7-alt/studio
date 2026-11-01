let status={phase:'local',message:'Сохранено на устройстве',lastLocalSave:'',lastCloudSync:'',error:''};
function emit(){dispatchEvent(new CustomEvent('planner-storage-status',{detail:getStorageStatus()}));}
export function getStorageStatus(){return {...status};}
export function markLocalSaved(){status={...status,phase:'local',message:'Сохранено на устройстве',lastLocalSave:new Date().toISOString(),error:''};emit();}
export function markSyncing(){status={...status,phase:'syncing',message:'Синхронизация…',error:''};emit();}
export function markCloudSaved(){const now=new Date().toISOString();status={...status,phase:'cloud',message:'Сохранено локально и в облаке',lastCloudSync:now,error:''};emit();}
export function markSyncError(error,conflict=false){status={...status,phase:conflict?'conflict':'error',message:conflict?'Конфликт версий — изменения не затёрты':'Ошибка синхронизации — локальная копия сохранена',error:String(error?.message||error||'Неизвестная ошибка')};emit();}
