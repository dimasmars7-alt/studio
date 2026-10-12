import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const directory=resolve('src');
for(const name of (await readdir(directory)).filter(name=>name.endsWith('.js'))){
 const result=spawnSync(process.execPath,['--check',resolve(directory,name)],{encoding:'utf8'});
 if(result.status!==0)throw Error(name+'\n'+result.stderr);
}
console.log('JavaScript syntax checks passed');
