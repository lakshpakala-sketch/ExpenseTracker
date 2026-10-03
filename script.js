const CATS=['Food','Transport','Rent','Bills','Shopping','Health','Fun','Other'];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let users=load('t_users',[]),exps=load('t_exps',[]),me=load('t_me',null),view='home',tab='login',q='',fCat='';

function seed(){
  if(!users.some(u=>u.role==='admin')){
    users.push({id:uid(),name:'Admin',email:'admin@tally.com',pass:'admin123',role:'admin',status:'approved',created:Date.now()});
    saveAll();
  }
}
const saveAll=()=>{save('t_users',users);save('t_exps',exps)};
const cur=()=>users.find(u=>u.id===me);
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2200)}
function go(v){view=v;render()}

function signup(e){
  e.preventDefault();const f=e.target,email=f.email.value.trim().toLowerCase();
  if(users.some(u=>u.email===email))return $('#msg').textContent='That email is already registered. Log in instead.';
  if(f.pass.value.length<6)return $('#msg').textContent='Use a password with at least 6 characters.';
  users.push({id:uid(),name:f.name.value.trim(),email,pass:f.pass.value,role:'user',status:'pending',created:Date.now()});
  saveAll();tab='login';render();toast('Account created. An admin must approve it before you can log in.');
}
function login(e){
  e.preventDefault();const f=e.target,email=f.email.value.trim().toLowerCase();
  const u=users.find(u=>u.email===email&&u.pass===f.pass.value);
  if(!u)return $('#msg').textContent='Email or password is incorrect.';
  if(u.status==='pending')return $('#msg').textContent='Your account is waiting for admin approval.';
  if(u.status==='suspended')return $('#msg').textContent='This account is suspended. Contact an admin.';
  me=u.id;save('t_me',me);view=u.role==='admin'?'admin':'dash';render();
}
function logout(){me=null;localStorage.removeItem('t_me');view='home';render()}

function addExp(e){
  e.preventDefault();const f=e.target;
  exps.push({id:uid(),uid:me,title:f.title.value.trim(),amount:+f.amount.value,cat:f.cat.value,date:f.date.value});
  saveAll();render();toast('Expense added');
}
function delExp(id){if(confirm('Delete this expense?')){exps=exps.filter(x=>x.id!==id);saveAll();render();if(!$('#modal').hidden)toast('Expense deleted')}}
function csv(list,withUser){
  const rows=[['Date','Title','Category','Amount',...(withUser?['User']:[])],...list.map(x=>[x.date,x.title,x.cat,x.amount,...(withUser?[(users.find(u=>u.id===x.uid)||{}).email||'deleted']:[])])];
  const blob=new Blob([rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='expenses.csv';a.click();
}
const exportMine=()=>csv(exps.filter(x=>x.uid===me));
const exportAll=()=>csv(exps,true);

function setStatus(id,s){const u=users.find(u=>u.id===id);u.status=s;saveAll();render();toast(`User ${s}`)}
function toggleRole(id){const u=users.find(u=>u.id===id);u.role=u.role==='admin'?'user':'admin';saveAll();render()}
function delUser(id){
  const u=users.find(u=>u.id===id);
  if(u.id===me)return toast("You can't delete your own account");
  if(confirm(`Delete ${u.email} and all their expenses? This cannot be undone.`)){
    users=users.filter(x=>x.id!==id);exps=exps.filter(x=>x.uid!==id);saveAll();render();toast('User deleted');
  }
}
function viewUser(id){
  const u=users.find(u=>u.id===id),list=exps.filter(x=>x.uid===id).sort((a,b)=>b.date.localeCompare(a.date));
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="card"><h2>${esc(u.name)}</h2>
  <p class="hint">${esc(u.email)} · joined ${new Date(u.created).toLocaleDateString()} · ${list.length} expenses · ${money(list.reduce((s,x)=>s+x.amount,0))} total</p>
  ${list.length?`<div class="scroll"><table><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th></th></tr>${list.map(x=>`<tr><td>${x.date}</td><td>${esc(x.title)}</td><td>${x.cat}</td><td>${money(x.amount)}</td><td><button class="sm danger" onclick="delExp('${x.id}');viewUser('${id}')">Delete</button></td></tr>`).join('')}</table></div>`:'<p class="empty">This user has no expenses yet.</p>'}
  <p><button onclick="closeModal()">Close</button></p></div>`;
}
function closeModal(){$('#modal').hidden=true;render()}

function nav(){
  const u=cur();
  $('#nav').innerHTML=u?`<span class="hint">${esc(u.name)} (${u.role})</span><button onclick="go('${u.role==='admin'?'admin':'dash'}')">${u.role==='admin'?'Admin portal':'My expenses'}</button>${u.role==='admin'?`<button onclick="go('dash')">My own tracker</button>`:''}<button onclick="logout()">Log out</button>`
    :`<button onclick="tab='login';go('home')">Log in</button><button class="primary" onclick="tab='signup';go('home')">Sign up</button>`;
}
function home(){
  return `<div class="wrap hero"><div><h1>Know where your money went.</h1><p>Log each expense in seconds, see spending by category, and export everything to a spreadsheet whenever you need it.</p></div>
  <div class="card"><div class="tabs"><button class="${tab==='login'?'on':''}" onclick="tab='login';render()">Log in</button><button class="${tab==='signup'?'on':''}" onclick="tab='signup';render()">Sign up</button></div>
  <form onsubmit="${tab==='login'?'login':'signup'}(event)">
  ${tab==='signup'?'<label for="name">Full name</label><input id="name" name="name" required>':''}
  <label for="email">Email</label><input id="email" name="email" type="email" required>
  <label for="pass">Password</label><input id="pass" name="pass" type="password" required>
  <p class="msg" id="msg" role="alert"></p><button class="primary" style="width:100%">${tab==='login'?'Log in':'Create account'}</button></form>
  <p class="hint">${tab==='signup'?'New accounts need admin approval before first login.':'Admin Login/User Login:'}</p></div></div>`;
}
function dash(){
  const mine=exps.filter(x=>x.uid===me),mon=new Date().toISOString().slice(0,7);
  let list=mine.filter(x=>(!fCat||x.cat===fCat)&&x.title.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  const total=mine.reduce((s,x)=>s+x.amount,0),month=mine.filter(x=>x.date.startsWith(mon)).reduce((s,x)=>s+x.amount,0);
  const by=CATS.map(c=>[c,mine.filter(x=>x.cat===c).reduce((s,x)=>s+x.amount,0)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]),max=by[0]?by[0][1]:1;
  return `<div class="wrap"><div class="stats"><div class="card stat"><b>${money(month)}</b><span>Spent this month</span></div><div class="card stat"><b>${money(total)}</b><span>All time</span></div><div class="card stat"><b>${mine.length}</b><span>Expenses logged</span></div></div>
  <div class="cols"><div><form class="card" onsubmit="addExp(event)"><h3>Add expense</h3>
  <label for="t">What was it?</label><input id="t" name="title" required maxlength="60">
  <label for="a">Amount (₹)</label><input id="a" name="amount" type="number" min="0.01" step="0.01" required>
  <label for="c">Category</label><select id="c" name="cat">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
  <label for="d">Date</label><input id="d" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}">
  <p></p><button class="primary" style="width:100%">Add expense</button></form>
  <div class="card" style="margin-top:16px"><h3>By category</h3>${by.length?by.map(([c,v])=>`<div class="bar"><span>${c}</span><i style="width:${v/max*100}%"></i><span>${money(v)}</span></div>`).join(''):'<p class="empty">Add an expense to see your breakdown.</p>'}</div></div>
  <div class="card"><div class="row"><input placeholder="Search expenses" value="${esc(q)}" oninput="q=this.value;render(true)" aria-label="Search"><select onchange="fCat=this.value;render()" aria-label="Filter category"><option value="">All categories</option>${CATS.map(c=>`<option ${c===fCat?'selected':''}>${c}</option>`).join('')}</select><button onclick="exportMine()">Export CSV</button></div>
  ${list.length?`<div class="scroll"><table><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th></th></tr>${list.map(x=>`<tr><td>${x.date}</td><td>${esc(x.title)}</td><td>${x.cat}</td><td>${money(x.amount)}</td><td><button class="sm danger" onclick="delExp('${x.id}')">Delete</button></td></tr>`).join('')}</table></div>`:'<p class="empty">No expenses match. Add one on the left.</p>'}</div></div></div>`;
}
function admin(){
  const cust=users.filter(u=>u.role!=='admin'||true),pend=users.filter(u=>u.status==='pending').length;
  const list=cust.filter(u=>(u.name+u.email).toLowerCase().includes(q.toLowerCase()));
  return `<div class="wrap"><h2>Admin portal</h2><div class="stats">
  <div class="card stat"><b>${users.length}</b><span>Total users</span></div><div class="card stat"><b style="color:var(--warn)">${pend}</b><span>Awaiting approval</span></div>
  <div class="card stat"><b>${exps.length}</b><span>Expenses logged</span></div><div class="card stat"><b>${money(exps.reduce((s,x)=>s+x.amount,0))}</b><span>Total tracked</span></div></div>
  <div class="card"><div class="row"><input placeholder="Search users by name or email" value="${esc(q)}" oninput="q=this.value;render(true)" aria-label="Search users"><button onclick="exportAll()">Export all expenses (CSV)</button></div>
  <div class="scroll"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Expenses</th><th>Actions</th></tr>
  ${list.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td><span class="tag ${u.status}">${u.status}</span></td><td>${exps.filter(x=>x.uid===u.id).length}</td>
  <td><div class="act"><button class="sm" onclick="viewUser('${u.id}')">View data</button>
  ${u.status!=='approved'?`<button class="sm primary" onclick="setStatus('${u.id}','approved')">Approve</button>`:''}
  ${u.status==='approved'&&u.id!==me?`<button class="sm" onclick="setStatus('${u.id}','suspended')">Suspend</button>`:''}
  ${u.id!==me?`<button class="sm" onclick="toggleRole('${u.id}')">${u.role==='admin'?'Remove admin':'Make admin'}</button><button class="sm danger" onclick="delUser('${u.id}')">Delete</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No users match your search.</td></tr>'}
  </table></div></div></div>`;
}
function render(keepFocus){
  const u=cur();
  if(me&&!u){me=null;localStorage.removeItem('t_me')}
  if(!u&&view!=='home')view='home';
  if(view==='admin'&&u?.role!=='admin')view='dash';
  const active=document.activeElement,id=active&&active.getAttribute('aria-label'),pos=active&&active.selectionStart;
  nav();$('#app').innerHTML={home,dash,admin}[view]();
  if(keepFocus&&id){const el=document.querySelector(`[aria-label="${id}"]`);if(el){el.focus();el.setSelectionRange(pos,pos)}}
}
seed();
if(cur())view=cur().role==='admin'?'admin':'dash';
render();
