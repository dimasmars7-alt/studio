const container=document.querySelector('#planner');
function showFailure(error){if(!container.querySelector('.loading'))return;console.error('Не удалось запустить контент-план:',error);container.replaceChildren();const panel=document.createElement('section');panel.className='empty-panel';const title=document.createElement('h1');title.textContent='Не удалось загрузить контент-план';const note=document.createElement('p');note.textContent='Повторите загрузку. Сохранённые материалы остаются на этом устройстве.';const button=document.createElement('button');button.type='button';button.className='primary';button.textContent='Повторить загрузку';button.onclick=()=>location.reload();panel.append(title,note,button);container.append(panel);}
if(location.protocol==='file:'){
 container.replaceChildren();
 const panel=document.createElement('section');panel.className='empty-panel';
 const title=document.createElement('h1');title.textContent='Откройте контент-план через сайт';
 const note=document.createElement('p');note.textContent='Вы открыли файл напрямую с компьютера. В этом режиме браузер не запускает приложение.';
 const link=document.createElement('button');link.type='button';link.className='primary';link.textContent='Открыть опубликованный сайт';link.onclick=()=>location.assign('https://tarusovphotographer.online/planner.html');
 const local=document.createElement('p');local.textContent='Для локального просмотра запустите «Open-Tarusov-Planner.cmd» из папки Документы → Codex.';
 panel.append(title,note,link,local);container.append(panel);
}else{
 window.addEventListener('error',event=>showFailure(event.error||event.message));window.addEventListener('unhandledrejection',event=>showFailure(event.reason));
 import('./planner-app.js?v=20261018-import1').catch(showFailure);
}

