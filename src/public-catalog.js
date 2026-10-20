import {getPublicCatalog} from './cloud-client.js?v=20261019-public1';

const root=document.querySelector('#catalog');
const token=new URLSearchParams(location.search).get('catalog')||'';
let catalog=null;

function element(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
}

function render(projects){
 root.replaceChildren();
 root.append(element('div','eyebrow','Проекты организации'));
 root.append(element('h1','',catalog.organization||'Проекты'));
 root.append(element('p','lede','Темы и проекты, открытые для просмотра по ссылке.'));
 const toolbar=element('div','catalog-toolbar');
 toolbar.append(element('h2','',`Проекты · ${projects.length}`));
 const search=element('input','catalog-search');search.type='search';search.placeholder='Найти проект или тему';search.setAttribute('aria-label','Поиск проектов и тем');
 search.addEventListener('input',()=>renderCards(search.value));
 toolbar.append(search);root.append(toolbar);
 const grid=element('div','projects-grid');grid.id='project-cards';root.append(grid);
 function renderCards(query=''){
  grid.replaceChildren();
  const needle=query.trim().toLocaleLowerCase('ru');
  const filtered=projects.filter(project=>!needle||[project.name,project.description,...(project.topics||[]).map(topic=>topic.title)].some(value=>String(value||'').toLocaleLowerCase('ru').includes(needle)));
  if(!filtered.length){grid.append(element('p','empty-state',projects.length?'По вашему запросу проектов нет.':'Пока нет проектов для просмотра.'));return}
  filtered.forEach((project,index)=>{
   const card=element('article','project-card');
   const top=element('div','project-topline');top.append(element('span','project-number',String(index+1).padStart(2,'0')));top.append(element('span','topic-count',`${(project.topics||[]).length} тем`));card.append(top);
   card.append(element('h3','',project.name||'Без названия'));
   card.append(element('p','project-desc',project.description||'Описание пока не добавлено'));
   const list=element('ol','topic-list');
   (project.topics||[]).forEach((topic,topicIndex)=>{const item=element('li','');item.append(element('span','',String(topicIndex+1).padStart(2,'0')));item.append(element('strong','',topic.title||''));list.append(item)});
   if(!list.childElementCount)list.append(element('li','','Темы пока не добавлены'));
   card.append(list);grid.append(card);
  });
 }
 renderCards();
}

try{
 catalog=await getPublicCatalog(token);
 render(catalog.projects);
}catch(error){
 root.replaceChildren();
 const box=element('section','error-state');
 box.append(element('h1','','Проекты не открылись'));
 box.append(element('p','',error.message==='Failed to fetch'?'Облако сейчас недоступно. Попробуйте открыть ссылку позже.':error.message));
 root.append(box);
}
