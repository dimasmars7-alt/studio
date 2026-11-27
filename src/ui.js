import {icon} from './icons.js?v=20261012-cloud1';
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
 else if(type==='date')input='<span class="date-input-wrap"><input '+attrs+' type="date" value="'+escape(value)+'"><button type="button" class="date-picker-trigger" data-date-picker-trigger aria-label="Открыть календарь">'+icon('cal')+'</button></span>';
 else input='<input '+attrs+' type="'+type+'" value="'+escape(value)+'" '+(type==='number'?'min="0" step="any"':'')+'>';
 return '<label class="field">'+escape(label)+input+'</label>'+(name==='emoji'?'<div class="toolbar" aria-label="Быстрый выбор эмодзи">'+['📷','📁','🎬','📰','🏷️','💒','✨','🎒','🎨','💼','🌿','⭐'].map(icon=>button('emoji',icon,'data-emoji="'+icon+'" aria-label="Выбрать '+icon+'"')).join('')+'</div>':'');
}
export function timeField(name='time',label='Время',value=''){
 const quick=[['09:00','Утро — 09:00'],['14:00','День — 14:00'],['19:00','Вечер — 19:00']],quickValues=new Set(quick.map(([v])=>v)),exact=[];
 for(let hour=0;hour<24;hour++)for(const minute of [0,30]){const time=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');if(!quickValues.has(time))exact.push([time,time]);}
 const option=([v,t])=>'<option value="'+escape(v)+'" '+(String(value)===String(v)?'selected':'')+'>'+escape(t)+'</option>';
 return '<label class="field">'+escape(label)+'<select name="'+escape(name)+'"><option value="" '+(!value?'selected':'')+'>Время не задано</option><optgroup label="Быстрый выбор">'+quick.map(option).join('')+'</optgroup><optgroup label="Точное время">'+exact.map(option).join('')+'</optgroup></select></label>';
}
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-date-picker-trigger]');
 if(trigger){event.preventDefault();const input=trigger.closest('.date-input-wrap')?.querySelector('input[type=date]');try{input?.showPicker?.()}catch{input?.focus()}return;}
 const label=event.target.closest('label.field');
 if(label&&!event.target.closest('input,select,textarea,button')){const input=label.querySelector('input[type=date]');try{input?.showPicker?.()}catch{input?.focus()}}
});
export function toast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),4200)}
function askDiscard(){
 const c=document.querySelector('#confirm-discard')||Object.assign(document.body.appendChild(document.createElement('dialog')),{id:'confirm-discard'});
 c.innerHTML='<div class="confirm-discard-content"><span class="eyebrow">НЕСОХРАНЁННЫЕ ИЗМЕНЕНИЯ</span><h2>Закрыть без сохранения?</h2><p>Введённые данные будут отменены.</p><div class="confirm-discard-actions"><button type="button" data-discard-cancel>Остаться</button><button type="button" class="primary" data-discard-confirm>Закрыть без сохранения</button></div></div>';
 return new Promise(resolve=>{
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;c.close();resolve(value)};
  c.querySelector('[data-discard-cancel]').onclick=()=>finish(false);
  c.querySelector('[data-discard-confirm]').onclick=()=>finish(true);
  c.oncancel=event=>{event.preventDefault();finish(false)};
  c.showModal();
 });
}
export function openDialog(title,body,onSubmit,wide=false){
 const d=document.querySelector('#modal');
 d.className=wide?'wide':'';
 d.innerHTML='<form method="dialog"><header><div><span class="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span><h2>'+escape(title)+'</h2></div><button type="button" class="icon-btn" aria-label="Закрыть" id="close-dialog">×</button></header><div class="dialog-body">'+body+'</div>'+(onSubmit?'<footer><button type="button" id="cancel-dialog">Отмена</button><button class="primary" type="submit">Сохранить</button></footer>':'')+'</form>';
 const form=d.querySelector('form');
 let dirty=false;
 const closeDialog=async()=>{if(dirty&&onSubmit&&!await askDiscard())return;dirty=false;if(d.open)d.close()};
 form.addEventListener('input',()=>{dirty=true});
 form.addEventListener('change',()=>{dirty=true});
 d.querySelector('#close-dialog').onclick=closeDialog;
 const cancel=d.querySelector('#cancel-dialog');if(cancel)cancel.onclick=closeDialog;
 d.oncancel=event=>{if(!dirty||!onSubmit)return;event.preventDefault();closeDialog()};
 form.onsubmit=async e=>{if(!onSubmit)return;e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{await onSubmit(Object.fromEntries(new FormData(form)));dirty=false;d.close()}catch(err){toast(err.message)}finally{submit.disabled=false}};
 if(!d.open)d.showModal();
}

function decorate(label){const m=String(label).match(/^([＋+←↑↓↗▦☷▧▤✓⚙☰×])(?:\s|$)/);return m?icon({'＋':'plus','+':'plus','←':'back','↑':'up','↓':'down','↗':'external','▦':'cal','☷':'table','▧':'portfolio','▤':'content','✓':'check','⚙':'settings','☰':'menu','×':'close'}[m[1]])+label.slice(m[1].length):label;}
