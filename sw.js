const CACHE='studio-content-preview-20261008-topic-only7';
const ASSETS=['./src/topic-table.js','./src/topic-metrics.js','./src/topic-table.css','./src/studio-design.css','./src/icons.js','./src/shooting-mode.js','./src/qa-scenario.js','./src/table-records.js','./','./index.html','./planner.html','./src/planner.css','./src/planner-model.js','./src/planner-view.js','./src/planner-app.js','./src/planner-boot.js','./src/planner-boot.js','./src/folder-model.js','./src/folder-view.js','./src/reference-view.js','./src/quick-create.js','./src/script-composer.js','./src/storyboard.js','./src/workspace-shell.js','./src/workspace.css','./src/content-calendar.js','./src/project-assets.js','./src/scene-timing.js','./src/scenario-plan.js','./src/project-colors.js','./src/styles.css','./src/content.css','./src/content.js','./src/planning.js','./src/app.js','./src/model.js','./src/storage.js','./src/ui.js','./src/views.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...new Set(ASSETS)].map(url=>new Request(url,{cache:"reload"})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('studio-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(new URL(event.request.url).pathname.startsWith('/api/'))return;
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(new Request(event.request,{cache:"no-cache"})).then(response=>{
 if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}
 return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html','./planner.html','./src/planner.css','./src/planner-model.js','./src/planner-view.js','./src/planner-app.js','./src/planner-boot.js','./src/planner-boot.js','./src/folder-model.js','./src/folder-view.js','./src/reference-view.js','./src/quick-create.js','./src/script-composer.js','./src/storyboard.js','./src/workspace-shell.js','./src/workspace.css','./src/content-calendar.js','./src/project-assets.js','./src/scene-timing.js','./src/scenario-plan.js','./src/project-colors.js'):Response.error()))));
});

