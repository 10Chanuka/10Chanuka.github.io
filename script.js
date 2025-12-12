/* ------------------ Data model & storage ------------------ */
const STORAGE_KEY = 'cashbookData_v1';

function makeId(prefix='A'){return prefix + Date.now().toString(36).slice(-6)}

function defaultData(){
  return {accounts:[], transactions:[], settings:{admin:{username:'Chanuka', password:'GTAigi2004'}}}
}

function load(){
  try{const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): defaultData()}catch(e){console.error(e); return defaultData()}
}
function save(data){localStorage.setItem(STORAGE_KEY, JSON.stringify(data))}

let DB = load();

/* ------------------ Helpers ------------------ */
function formatDate(ts){const d=new Date(ts); return d.toLocaleString()}
function currency(n){return (Number(n)||0).toLocaleString()}

function findAccount(id){return DB.accounts.find(a=>a.id===id)}
function accountBalance(id){
  const tx = DB.transactions.filter(t=>t.accountId===id).sort((a,b)=>a.ts-b.ts)
  let bal=0; let credits=0,debits=0;
  tx.forEach(t=>{ if(t.type==='credit'){bal+=t.amount; credits+=t.amount}else{bal-=t.amount; debits+=t.amount}})
  return {balance:bal, credits, debits, count:tx.length, tx}
}

/* ------------------ UI render ------------------ */
const accountListEl = document.getElementById('accountList');
const mainTitle = document.getElementById('mainTitle');
const mainSubtitle = document.getElementById('mainSubtitle');
const balanceValue = document.getElementById('balanceValue');
const balanceDetails = document.getElementById('balanceDetails');
const txnCount = document.getElementById('txnCount');
const txnBody = document.getElementById('txnBody');
const userBadge = document.getElementById('userBadge');

let selectedAccount = null; // id
let currentUser = null; // {role:'admin' or 'member', id, name}

function renderAccounts(){
  accountListEl.innerHTML='';
  DB.accounts.forEach(a=>{
    const div = document.createElement('div'); div.className='acct';
    div.innerHTML = `
      <div class="meta"><div class="avatar">${a.name.slice(0,2).toUpperCase()}</div>
        <div>
          <div style="font-weight:700">${a.name}</div>
          <div class="muted">ID: ${a.id} • ${a.email||'no email'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="muted">${currency(accountBalance(a.id).balance)}</div>
        <button class="btn" data-id="${a.id}">Open</button>
      </div>`;
    accountListEl.appendChild(div);
  })
  // attach open handlers
  accountListEl.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    openAccount(btn.dataset.id);
  }))
}

function renderSelected(){
  if(!selectedAccount){ mainTitle.textContent='Welcome'; mainSubtitle.textContent='Select an account to see transactions.'; balanceValue.textContent='-'; balanceDetails.textContent='Credits: 0 • Debits: 0'; txnBody.innerHTML=''; txnCount.textContent='0'; return }
  const acct = findAccount(selectedAccount);
  mainTitle.textContent = acct.name + (currentUser && currentUser.role==='admin' ? ' (admin view)' : ' (member view)');
  mainSubtitle.textContent = `ID: ${acct.id} • ${acct.email || 'no email'}`;
  const st = accountBalance(selectedAccount);
  balanceValue.textContent = currency(st.balance);
  balanceDetails.textContent = `Credits: ${currency(st.credits)} • Debits: ${currency(st.debits)}`;
  txnCount.textContent = st.count;
  // table
  txnBody.innerHTML=''; let running=0;
  st.tx.forEach(t=>{
    running += (t.type==='credit'? t.amount : -t.amount);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatDate(t.ts)}</td><td>${t.type}</td><td>${t.desc||''}</td><td>${t.category||''}</td><td>${currency(t.amount)}</td><td>${currency(running)}</td><td>${t.by||'admin'}</td>`;
    txnBody.appendChild(tr);
  })
}

/* ------------------ Account management ------------------ */
function openAccount(id){
  const acct = findAccount(id);
  if(!acct) return alert('Account not found');
  // if admin is logged, open directly; else ask member password
  if(currentUser && currentUser.role==='admin'){
    selectedAccount = id; renderSelected();
  } else {
    // prompt for view password
    MemberViewPrompt(id);
  }
}

function createAccount({name,email,viewPassword}){
  const id = makeId('A');
  DB.accounts.push({id,name,email,viewPassword}); save(DB); renderAccounts(); return id;
}

function deleteAccount(id){ DB.accounts = DB.accounts.filter(a=>a.id!==id); DB.transactions = DB.transactions.filter(t=>t.accountId!==id); save(DB); renderAccounts(); if(selectedAccount===id){selectedAccount=null; renderSelected()} }

/* ------------------ Transactions ------------------ */
function addTransaction({accountId,type,amount,desc,category,by}){
  if(!accountId) return alert('Select account');
  amount = Number(amount); if(isNaN(amount) || amount<=0) return alert('Enter positive amount');
  const t = {id: makeId('T'), accountId, type, amount, desc, category, ts: Date.now(), by: by||'admin'};
  DB.transactions.push(t); save(DB); renderSelected(); renderAccounts();
}

/* ------------------ Modals & prompts ------------------ */
const modalRoot = document.getElementById('modalRoot');
function modal(html){ const wrap = document.createElement('div'); wrap.className='modal'; wrap.innerHTML = `<div class="box card">${html}</div>`; modalRoot.appendChild(wrap); return wrap }
function closeModals(){ modalRoot.innerHTML='' }

// Admin login modal
function showLogin(){
  const m = modal(`<h3>Admin Login</h3>
    <form id="loginForm">
      <div style="margin-top:10px"><input id="uName" placeholder="Username" value="${DB.settings.admin.username}" /></div>
      <div style="margin-top:8px"><input id="uPass" type="password" placeholder="Password" /></div>
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
        <button type="button" id="cancelBtn" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Login</button>
      </div>
    </form>`)
  m.querySelector('#cancelBtn').addEventListener('click',closeModals)
  m.querySelector('#loginForm').addEventListener('submit',e=>{
    e.preventDefault(); const u = m.querySelector('#uName').value.trim(); const p = m.querySelector('#uPass').value;
    if(u===DB.settings.admin.username && p===DB.settings.admin.password){ currentUser = {role:'admin', name:'Administrator'}; userBadge.textContent='Admin'; closeModals(); renderSelected(); } else { alert('Invalid admin credentials') }
  })
}

// Add account modal
function showAddAccount(){
  const m = modal(`<h3>Create Account</h3>
    <form id="acctForm">
      <div style="margin-top:8px"><input id="aName" placeholder="Member name" required /></div>
      <div style="margin-top:8px"><input id="aEmail" placeholder="Email (optional)" /></div>
      <div style="margin-top:8px"><input id="aPass" placeholder="Member view password (for members to view)" required /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" id="cancelBtn" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Create</button>
      </div>
    </form>`)
  m.querySelector('#cancelBtn').addEventListener('click',closeModals)
  m.querySelector('#acctForm').addEventListener('submit',e=>{
    e.preventDefault(); const name=m.querySelector('#aName').value.trim(); const email=m.querySelector('#aEmail').value.trim(); const pass=m.querySelector('#aPass').value;
    const id = createAccount({name,email,viewPassword:pass}); alert('Created account ID: '+id); closeModals();
  })
}

// Member view prompt (ask for view password)
function MemberViewPrompt(accountId){
  const acct = findAccount(accountId);
  const m = modal(`<h3>Member view: ${acct.name}</h3>
    <div class="muted-2">Enter Account ID and password to view transactions</div>
    <form id="mvForm">
      <div style="margin-top:8px"><input id="mvId" value="${acct.id}" readonly /></div>
      <div style="margin-top:8px"><input id="mvPass" placeholder="Password" type="password" required /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" id="cancelBtn" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Open</button>
      </div>
    </form>`)
  m.querySelector('#cancelBtn').addEventListener('click',closeModals)
  m.querySelector('#mvForm').addEventListener('submit',e=>{
    e.preventDefault(); const pass=m.querySelector('#mvPass').value;
    if(pass===acct.viewPassword){ currentUser = {role:'member', id:acct.id, name:acct.name}; selectedAccount = acct.id; userBadge.textContent = acct.name + ' (member)'; closeModals(); renderSelected(); } else { alert('Invalid password') }
  })
}

// Quick txn modal (admin only)
function showNewTxn(){
  if(!(currentUser && currentUser.role==='admin')) return alert('Only admin can add transactions');
  if(!selectedAccount) return alert('Select an account first');
  const m = modal(`<h3>New Transaction for ${findAccount(selectedAccount).name}</h3>
    <form id="txnForm">
      <div style="margin-top:8px"><select id="tType"><option value="credit">Credit</option><option value="debit">Debit</option></select></div>
      <div style="margin-top:8px"><input id="tAmount" type="number" placeholder="Amount" required /></div>
      <div style="margin-top:8px"><input id="tDesc" placeholder="Description" /></div>
      <div style="margin-top:8px"><input id="tCat" placeholder="Category (e.g., salary, groceries)" /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" id="cancelBtn" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Add</button>
      </div>
    </form>`)
  m.querySelector('#cancelBtn').addEventListener('click',closeModals)
  m.querySelector('#txnForm').addEventListener('submit',e=>{
    e.preventDefault(); const type=m.querySelector('#tType').value; const amt=m.querySelector('#tAmount').value; const desc=m.querySelector('#tDesc').value; const cat=m.querySelector('#tCat').value;
    addTransaction({accountId:selectedAccount, type, amount:amt, desc, category:cat, by:'admin'});
    closeModals();
  })
}

/* ------------------ Actions & buttons ------------------ */
document.getElementById('loginBtn').addEventListener('click', showLogin);
document.getElementById('addAccountBtn').addEventListener('click', ()=>{ if(!(currentUser && currentUser.role==='admin')) return alert('Only admin can add accounts'); showAddAccount(); });
document.getElementById('memberViewBtn').addEventListener('click', ()=>{
  // open a small chooser if there are accounts
  if(DB.accounts.length===0) return alert('No accounts yet');
  const options = DB.accounts.map(a=>`<option value="${a.id}">${a.name} (${a.id})</option>`).join('');
  const m = modal(`<h3>Member view</h3>
    <form id="selForm">
      <div style="margin-top:8px"><select id="selAcct">${options}</select></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" id="cancelBtn" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Open</button>
      </div>
    </form>`)
  m.querySelector('#cancelBtn').addEventListener('click',closeModals)
  m.querySelector('#selForm').addEventListener('submit',e=>{e.preventDefault(); const id=m.querySelector('#selAcct').value; closeModals(); MemberViewPrompt(id);})
})

document.getElementById('newTxnBtn').addEventListener('click', showNewTxn);

// Quick add form
document.getElementById('quickForm').addEventListener('submit', e=>{
  e.preventDefault(); if(!(currentUser && currentUser.role==='admin')) return alert('Admin only'); if(!selectedAccount) return alert('Select account');
  const type = document.getElementById('qType').value; const amount = document.getElementById('qAmount').value; const desc = document.getElementById('qDesc').value;
  addTransaction({accountId:selectedAccount,type,amount,desc,by:'admin'}); document.getElementById('qAmount').value=''; document.getElementById('qDesc').value='';
})

document.getElementById('refreshBtn').addEventListener('click', ()=>{ DB=load(); renderAccounts(); renderSelected(); alert('Refreshed') })

// export CSV for selected account or all
document.getElementById('exportBtn').addEventListener('click', ()=>{
  if(!selectedAccount) return alert('Open an account first');
  const st = accountBalance(selectedAccount);
  const rows = [['Date','Type','Description','Category','Amount','By']];
  st.tx.forEach(t=>rows.push([new Date(t.ts).toISOString(), t.type, t.desc||'', t.category||'', t.amount, t.by]));
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `${findAccount(selectedAccount).name.replace(/\s+/g,'_')}_transactions.csv`; a.click(); URL.revokeObjectURL(url);
})

// sample data
document.getElementById('sampleBtn').addEventListener('click', ()=>{
  if(!confirm('Load sample data? This will not delete existing data.')) return;
  const id1 = createAccount({name:'Saman', email:'saman@example.com', viewPassword:'1234'});
  const id2 = createAccount({name:'Nadeesha', email:'nadeesha@example.com', viewPassword:'abcd'});
  addTransaction({accountId:id1,type:'credit',amount:50000,desc:'Salary',category:'Income',by:'admin'});
  addTransaction({accountId:id1,type:'debit',amount:12000,desc:'Groceries',category:'Food',by:'admin'});
  addTransaction({accountId:id2,type:'credit',amount:30000,desc:'Freelance',category:'Income',by:'admin'});
  addTransaction({accountId:id2,type:'debit',amount:5000,desc:'Electricity',category:'Bills',by:'admin'});
  alert('Sample accounts created. Account IDs shown in sidebar. Default admin password: admin123');
})

// reset all
document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(!confirm('Reset all data? This will clear browser storage.')) return; localStorage.removeItem(STORAGE_KEY); DB = defaultData(); save(DB); selectedAccount=null; currentUser=null; userBadge.textContent='Not logged in'; renderAccounts(); renderSelected(); alert('Reset complete');
})

// initial render
renderAccounts(); renderSelected();

// small UX: allow admin to logout with clicking badge
userBadge.addEventListener('click', ()=>{
  if(currentUser){ if(confirm('Logout?')){currentUser=null; selectedAccount=null; userBadge.textContent='Not logged in'; renderSelected()} } else { alert('Click Admin Login to sign in') }
})

// Helpful: persist DB after each interaction automatically (already done in functions), but make sure to save on page unload
window.addEventListener('beforeunload', ()=> save(DB));

// keyboard shortcuts
window.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.key==='l'){ e.preventDefault(); showLogin(); }
  if(e.ctrlKey && e.key==='n'){ e.preventDefault(); if(currentUser && currentUser.role==='admin') showAddAccount(); }
})
