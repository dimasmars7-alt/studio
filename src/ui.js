import {icon} from './icons.js?v=20261008-topic-only7';
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(n)||0);
export const pretty=d=>d?new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'}):'Без даты';
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export const link=(url,label='Открыть ↗')=>safeUrl(url)?'<a href="'+escape(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+escape(label)+'</a>':'';
export const button=(action,label,data='',cls='')=>'<button type="button" class="'+cls+'" data-action="'+action+'" '+data+'>'+decorate(label)+'</button>';
export const empty=(title,detail='Добавьте первую запись, чтобы начать работу.')=>'<div class="empty"><span>◇</span><h3>'+escape(title)+'</h3><p>'+escape(detail)+'</p></div>';
export const badge=(text,color='#81867d')=>'<span class="badge" style="--tag:'+(/^#[0-9a-f]{6}$/i.test(color)?color:'#81867d')+'">'+escape(text)+'</span>';
export function field(name,label,value='',type='text',options=null,required=false){
 const attrs='name="'+name+'" '+(required?'required ':'');
 let input;
 if(options)input='<select '+attrs+'>'+options.map(([v,t])=>'<option value="'+escape(v)+'" '+(String(value)===String(v)?'selected':'')+'>'+escape(t)+'</option>').join('')+'</select>';
 else if(type==='textarea')input='<textarea '+attrs+' rows="4">'+escape(value)+'</textarea>';
 else input='<input '+attrs+' type="'+type+'" value="'+escape(value)+'" '+(type==='number'?'min="0" step="any"':'')+'>';
 return '<label class="field">'+escape(label)+input+'</label>'+(name==='emoji'?'<div class="toolbar" aria-label="Быстрый выбор эмодзи">'+['📷','📁','🎬','📰','🏷️','💒','✨','🎒','🎨','💼','🌿','⭐'].map(icon=>button('emoji',icon,'data-emoji="'+icon+'" aria-label="Выбрать '+icon+'"')).join('')+'</div>':'');
}
export function toast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),4200)}
export function openDialog(title,body,onSubmit,wide=false){
 const d=document.querySelector('#modal');
 d.className=wide?'wide':'';
 d.innerHTML='<form method="dialog"><header><div><span class="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span><h2>'+escape(title)+'</h2></div><button type="button" class="icon-btn" aria-label="Закрыть" id="close-dialog">×</button></header><div class="dialog-body">'+body+'</div>'+(onSubmit?'<footer><button type="button" id="cancel-dialog">Отмена</button><button class="primary" type="submit">Сохранить</button></footer>':'')+'</form>';
 d.querySelector('#close-dialog').onclick=()=>d.close();
 const cancel=d.querySelector('#cancel-dialog');if(cancel)cancel.onclick=()=>d.close();
 const form=d.querySelector('form');
 form.onsubmit=async e=>{if(!onSubmit)return;e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{await onSubmit(Object.fromEntries(new FormData(form)));d.close()}catch(err){toast(err.message)}finally{submit.disabled=false}};
 if(!d.open)d.showModal();
}

function decorate(label){const m=String(label).match(/^([＋+←↑↓↗▦☷▧▤✓⚙☰×])(?:\s|$)/);return m?icon({'＋':'plus','+':'plus','←':'back','↑':'up','↓':'down','↗':'external','▦':'cal','☷':'table','▧':'portfolio','▤':'content','✓':'check','⚙':'settings','☰':'menu','×':'close'}[m[1]])+label.slice(m[1].length):label;}

