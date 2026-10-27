import assert from 'node:assert/strict';

const events=[];
globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};
globalThis.dispatchEvent=event=>events.push(event);

const status=await import('../src/storage-status.js?test=1');
status.markLocalSaved();
assert.equal(status.getStorageStatus().phase,'local');
status.markSyncing();
assert.equal(status.getStorageStatus().phase,'syncing');
const conflict=new Error('stale version');
status.markSyncError(conflict,true);
assert.equal(status.getStorageStatus().phase,'conflict');
assert.match(status.getStorageStatus().message,/не затёрты/);
status.markCloudSaved();
assert.equal(status.getStorageStatus().phase,'cloud');
assert.ok(events.length>=4);
console.log('storage status tests passed');
