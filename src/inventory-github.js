import {REPOSITORY,parseInventory,mergeChanges} from './inventory-core.js';
const encode=text=>btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(''));
const decode=text=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export class GitHubInventory{
 #token='';
 constructor(catalog,{fetchImpl=globalThis.fetch.bind(globalThis),repository=REPOSITORY}={}){this.catalog=catalog;this.fetchImpl=fetchImpl;this.repository=repository;}
 get connected(){return !!this.#token;}
 disconnect(){this.#token='';}
 async request(path,{method='GET',body}={}){
  if(!this.#token)throw new Error('Сначала подключите GitHub.');
  let response;
  try{response=await this.fetchImpl(`https://api.github.com${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${this.#token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});}
  catch{const e=new Error('Ответ GitHub не получен. Проверьте связь и обновите данные перед повторной публикацией; черновик сохранён.');e.code='NETWORK';throw e;}
  if(!response.ok){
   const messages={401:'Токен недействителен или истёк. Подключите GitHub заново.',403:'Нет права записи или достигнут лимит GitHub. Проверьте Contents: Read and write и доступ к репозиторию.',404:'Репозиторий или файл недоступен этому токену.',409:'Данные изменились во время сохранения. Черновик сохранён; обновите данные.',422:'GitHub отклонил изменение. Проверьте права, защиту ветки и актуальность данных.'};
   if(response.status===401)this.disconnect();
   const e=new Error(messages[response.status]??'GitHub временно недоступен. Черновик остаётся в этом браузере.');e.code=response.status===409?'CONFLICT':response.status;throw e;
  }
  return response.json();
 }
 get root(){const r=this.repository;return `/repos/${r.owner}/${r.repo}`;}
 async read(){
  const r=this.repository,file=await this.request(`${this.root}/contents/${r.path}?ref=${encodeURIComponent(r.branch)}`);
  if(file.type!=='file'||file.encoding!=='base64'||typeof file.sha!=='string'||file.size>150000)throw new Error('Неверный файл доступности в репозитории.');
  return {data:parseInventory(decode(file.content),this.catalog),sha:file.sha};
 }
 async connect(token){
  this.#token=token.trim();
  try{const user=await this.request('/user');const snapshot=await this.read();return {...snapshot,login:user.login};}catch(e){this.disconnect();throw e;}
 }
 async publish(base,changes){
  if(!Object.keys(changes).length)throw new Error('Нет изменений для публикации.');
  const current=await this.read(),data=mergeChanges(current.data,base,changes,this.catalog),r=this.repository;
  const result=await this.request(`${this.root}/contents/${r.path}`,{method:'PUT',body:{message:`Update apartment availability (${Object.keys(changes).length} units)`,branch:r.branch,sha:current.sha,content:encode(JSON.stringify(data,null,2)+'\n')}});
  return {data,sha:result.content.sha,commit:result.commit.sha,url:result.commit.html_url};
 }
}
