
import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.80.0/+esm";
const db=createClient("https://bkbvgnckoiypdwappktn.supabase.co","sb_publishable_j0_8kuzGVr53OiGV3r9KgQ_bSEKdhrQ",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const cashDisplay=n=>`<span class="${Number(n)<0?"negative":"positive"}">${Number(n)<0?"("+money(Math.abs(n))+")":money(n)}</span>`;
const owedDisplay=n=>Number(n)>0?`<span class="negative">(${money(n)})</span>`:money(0);
const balanceDisplay=a=>["credit_card","personal_debt","auto_loan","tax_debt"].includes(a.kind)?owedDisplay(Math.max(0,-balance(a))):cashDisplay(balance(a));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const fmt=s=>s?String(s).slice(5,7)+"-"+String(s).slice(8,10)+"-"+String(s).slice(0,4):"";
const days=(a,b)=>Math.round((Date.parse(a+"T12:00:00")-Date.parse(b+"T12:00:00"))/86400000);
const uid=()=>state.ownerId||state.user?.id;
const state={user:null,ownerId:null,tab:"dashboard",accountView:"all",accounts:[],categories:[],payees:[],tx:[],splits:[],bills:[],occ:[],settings:null,filter:{range:"30",payee:"",account:"all",category:"all",kind:"all",from:today(),to:today()},report:{monthA:"",monthB:"",group:"category"}};
const alphabetic=(arr)=>[...arr].sort((a,b)=>String(a?.name??"").localeCompare(String(b?.name??""),undefined,{sensitivity:"base",numeric:true}));
const options=(arr,selected)=>[...arr].sort((a,b)=>(a.id===""?-1:b.id===""?1:0)||String(a.name).localeCompare(String(b.name),undefined,{sensitivity:"base",numeric:true})).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?"selected":"")+'>'+esc(a.name)+'</option>').join("");
const categories=kind=>state.categories.filter(c=>c.kind===kind&&!c.archived);
const activeAccounts=()=>alphabetic(state.accounts.filter(a=>!a.archived));
const nameOf=(id,list)=>list.find(x=>x.id===id)?.name||"—";
const balance=a=>{
 let n=Number(a.opening_balance);
 for(const t of state.tx){
  if(t.account_id===a.id){if(t.kind==="income")n+=Number(t.amount);else if(t.kind==="expense")n-=Number(t.amount);else if(t.kind==="transfer")n-=Number(t.amount);else if(t.kind==="adjustment")n+=Number(t.amount)*(t.notes==="negative"?-1:1);}
  if(t.kind==="transfer"&&t.destination_account_id===a.id)n+=Number(t.amount);
 }
 return Math.round(n*100)/100;
};
const cash=()=>state.accounts.filter(a=>!["credit_card","personal_debt","auto_loan","tax_debt"].includes(a.kind)).reduce((n,a)=>n+balance(a),0);
const debt=()=>state.accounts.filter(a=>a.kind==="credit_card").reduce((n,a)=>n+Math.max(0,-balance(a)),0);
const personalDebt=()=>state.accounts.filter(a=>a.kind==="personal_debt").reduce((n,a)=>n+Math.max(0,-balance(a)),0);
const autoDebt=()=>state.accounts.filter(a=>a.kind==="auto_loan").reduce((n,a)=>n+Math.max(0,-balance(a)),0);
const taxDebt=()=>state.accounts.filter(a=>a.kind==="tax_debt").reduce((n,a)=>n+Math.max(0,-balance(a)),0);
const titleCase=t=>({dashboard:"Overview",accounts:"My Accounts",transactions:"Transaction History",bills:"Upcoming Bills",reports:"Reports"}[t]);
function message(msg,error=false){const el=$("#message");el.textContent=msg;el.className="notice"+(error?" error":"");setTimeout(()=>{if(el.textContent===msg)el.classList.add("hidden")},5500)}
async function api(promise){const {data,error}=await promise;if(error)throw error;return data}
async function load(){
 const tables=["finance_accounts","finance_categories","finance_payees","finance_transactions","finance_transaction_splits","finance_bills","finance_bill_occurrences","finance_settings"];
 const data=await Promise.all(tables.map(t=>api(db.from(t).select("*"))));
 [state.accounts,state.categories,state.payees,state.tx,state.splits,state.bills,state.occ]=data;
 if(!state.categories.length){
   const starter=[["Groceries","expense"],["Restaurants","expense"],["Gas","expense"],["Utilities","expense"],["Housing","expense"],["Insurance","expense"],["Shopping","expense"],["Entertainment","expense"],["Household","expense"],["Medical","expense"],["Other Expense","expense"],["Miscellaneous","expense"],["Paycheck","income"],["Refund","income"],["Other Income","income"]];
   await api(db.from("finance_categories").upsert(starter.map(([name,kind])=>({name,kind,user_id:uid()})),{onConflict:"user_id,kind,name",ignoreDuplicates:true}));
   state.categories=await api(db.from("finance_categories").select("*"));
 }

 if(!state.categories.some(c=>c.kind==="expense"&&c.name.toLowerCase()==="miscellaneous")){
   await api(db.from("finance_categories").upsert({name:"Miscellaneous",kind:"expense",user_id:uid()},{onConflict:"user_id,kind,name",ignoreDuplicates:true}));
   state.categories=await api(db.from("finance_categories").select("*"));
 }
 state.settings=data[7][0]||null;
 render();
 if(!state.accounts.length){
  $("#devicePairing").classList.remove("hidden");
  const status=$("#pairMessage");
  if(status)status.textContent="No accounts were found for this device. If your financial records are visible on another device, connect this device using a pairing code from that device. Do not re-enter your balances or delete either app.";
 }
}
async function save(table,row){return api(db.from(table).insert({...row,user_id:uid()}).select().single())}
async function change(table,id,fields){return api(db.from(table).update(fields).eq("id",id).eq("user_id",uid()).select().single())}
function showTab(tab){state.tab=tab;render()}
function render(){
 if(!uid())return;
 $("#pageTitle").textContent=titleCase(state.tab);
 document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.tab));
 document.querySelectorAll(".page").forEach(s=>s.classList.toggle("hidden",s.id!==state.tab));
 $("#addBtn").textContent=state.tab==="accounts"?"+ Account":state.tab==="bills"?"+ Bill":"+ Transaction";
 $("#addBtn").classList.toggle("hidden",state.tab==="reports");
 renderDashboard();renderAccounts();renderTransactions();renderBills();renderReports();
}
const row=(name,subtitle,value,extra="")=>'<div class="rowitem"><div><strong>'+esc(name)+'</strong><small>'+esc(subtitle)+'</small></div><div class="right"><strong>'+value+'</strong>'+extra+'</div></div>';
function renderDashboard(){
 const now=today(),next=state.occ.filter(o=>o.status!=="paid"&&o.status!=="skipped"&&days(o.due_date,now)<=30);
 const owing=next.reduce((s,o)=>s+Math.max(0,Number(o.amount_due)-Number(o.amount_paid)),0);
 const last=state.tx.filter(t=>days(now,t.transaction_date)>=0&&days(now,t.transaction_date)<30);
 const inc=last.filter(t=>t.kind==="income").reduce((s,t)=>s+Number(t.amount),0);
 const spent=last.filter(t=>t.kind==="expense").reduce((s,t)=>s+Number(t.amount),0);
 const urgent=next.filter(o=>days(o.due_date,now)<=5).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 $("#dashboard").innerHTML='<div class="metrics"><div class="metric"><small>Available Cash</small><strong>'+cashDisplay(cash())+'</strong></div><div class="metric"><small>Credit Card Debt</small><strong>'+owedDisplay(debt())+'</strong></div><div class="metric"><small>Personal Debt</small><strong>'+owedDisplay(personalDebt())+'</strong></div><div class="metric"><small>Auto Loan Debt</small><strong>'+owedDisplay(autoDebt())+'</strong></div><div class="metric"><small>Tax Debt</small><strong>'+owedDisplay(taxDebt())+'</strong></div><div class="metric"><small>Income · Last 30 Days</small><strong>'+money(inc)+'</strong></div><div class="metric"><small>Expenses · Last 30 Days</small><strong>'+money(spent)+'</strong></div></div><div class="twocol"><div class="card" style="margin-top:15px"><h2>Upcoming Bills</h2><p class="muted">Due or overdue through the next 30 days: <strong>'+money(owing)+'</strong></p><p>Cash after listed bills: <strong>'+cashDisplay(cash()-owing)+'</strong></p>'+(urgent.length?urgent.slice(0,6).map(o=>row(nameOf(o.bill_id,state.bills),fmt(o.due_date),money(Number(o.amount_due)-Number(o.amount_paid)), '<div class="pill '+(days(o.due_date,now)<0?"overdue":"")+'">'+(days(o.due_date,now)<0?"Overdue":days(o.due_date,now)===0?"Due today":"Due in "+days(o.due_date,now)+" days")+'</div>')).join(""):'<p class="empty">No bills due within 5 days.</p>')+'</div><div class="card" style="margin-top:15px"><h2>Recent Transactions</h2>'+state.tx.slice().sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)).slice(0,6).map(t=>row(t.payee_name||nameOf(t.payee_id,state.payees)||t.kind,fmt(t.transaction_date)+" · "+nameOf(t.account_id,state.accounts), (t.kind==="income"?'<span class="positive">+'+money(t.amount)+'</span>':t.kind==="expense"?'<span class="negative">−'+money(t.amount)+'</span>':t.kind==="adjustment"?'<span class="'+(t.notes==="negative"?"negative":"positive")+'">'+(t.notes==="negative"?"−":"+")+money(t.amount)+'</span>':money(t.amount)))).join("")+'<button class="secondary" data-go="transactions">See all transactions</button></div></div>';
}
function renderAccounts(){
 const ac=activeAccounts(),view=state.accountView||"all";
 const groupDefs=[
  ["BANK & CASH ACCOUNTS",ac.filter(a=>["checking","savings","cash"].includes(a.kind)),"cash"],
  ["DIGITAL WALLETS",ac.filter(a=>a.kind==="digital_wallet"),"cash"],
  ["CREDIT CARDS",ac.filter(a=>a.kind==="credit_card"),"credit"],
  ["PERSONAL DEBT",ac.filter(a=>a.kind==="personal_debt"),"personal"],
  ["AUTO LOANS",ac.filter(a=>a.kind==="auto_loan"),"auto"],
  ["TAX DEBT",ac.filter(a=>a.kind==="tax_debt"),"tax"]
 ];
 const metrics=[["cash","Available Cash",cashDisplay(cash())],["credit","Credit Card Debt",owedDisplay(debt())],["personal","Personal Debt",owedDisplay(personalDebt())],["auto","Auto Loan Debt",owedDisplay(autoDebt())],["tax","Tax Debt",owedDisplay(taxDebt())]];
 const buttons=metrics.map(([key,label,total])=>
  '<button type="button" class="metric account-filter'+(view===key?' selected':'')+'" data-account-view="'+key+'" aria-pressed="'+(view===key)+'" title="Show '+label+' accounts"><small>'+label+'</small><strong>'+total+'</strong></button>'
 ).join("");
 const groups=groupDefs.filter(([,list,key])=>view==="all"||key===view);
 $("#accounts").innerHTML='<div class="metrics">'+buttons+'</div>'+
 (view!=="all"?'<div class="account-filter-actions"><button type="button" class="secondary" data-account-view="all">Show All Accounts</button></div>':'')+
 groups.map(([label,list])=>'<div class="card" style="margin-top:15px"><h2>'+label+'</h2>'+(list.length?list.map(a=>'<div class="rowitem"><div><strong>'+esc(a.name)+'</strong><small>'+esc(a.kind.replaceAll("_"," "))+'</small></div><div class="right"><strong>'+balanceDisplay(a)+'</strong><button class="secondary" data-edit-account="'+esc(a.id)+'">Edit</button></div></div>').join(""):'<p class="empty">No accounts in this category.</p>')+'</div>').join("");
}
function filterTx(){
 let f=state.filter,now=today();
 return state.tx.filter(t=>{
  const dd=days(now,t.transaction_date);
  let valid=f.range==="all"||(f.range==="today"&&dd===0)||(f.range==="7"&&dd>=0&&dd<7)||(f.range==="30"&&dd>=0&&dd<30)||(f.range==="custom"&&t.transaction_date>=f.from&&t.transaction_date<=f.to);
  if(f.kind!=="all"&&t.kind!==f.kind)valid=false;
  if(f.account!=="all"&&t.account_id!==f.account&&t.destination_account_id!==f.account)valid=false;
  if(f.payee&&!String(t.payee_name||nameOf(t.payee_id,state.payees)).toLowerCase().includes(f.payee.toLowerCase()))valid=false;
  if(f.category!=="all"&&t.category_id!==f.category&&!state.splits.some(s=>s.transaction_id===t.id&&s.category_id===f.category))valid=false;
  return valid;
 }).sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)||b.created_at.localeCompare(a.created_at));
}
function renderTransactions(){
 const f=state.filter,selected=filterTx(),income=selected.filter(t=>t.kind==="income").reduce((a,t)=>a+Number(t.amount),0),out=selected.filter(t=>t.kind==="expense").reduce((a,t)=>a+Number(t.amount),0);
 const ranges=[["today","Today"],["7","Last 7 Days"],["30","Last 30 Days"],["custom","Custom Date Range"],["all","All Dates"]].sort((a,b)=>a[1].localeCompare(b[1]));
 $("#transactions").innerHTML='<div class="card"><div class="filterbar"><label>Search Payee<input data-filter="payee" value="'+esc(f.payee)+'" placeholder="Payee name"></label><label>Date Range<select data-filter="range">'+ranges.map(([v,t])=>'<option value="'+v+'" '+(v===f.range?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>Type<select data-filter="kind">'+[["all","All"],["expense","Expense"],["income","Income"],["transfer","Transfer"],["adjustment","Adjustment"]].sort((a,b)=>a[1].localeCompare(b[1])).map(([v,t])=>'<option value="'+v+'" '+(f.kind===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>Account<select data-filter="account"><option value="all">All</option>'+options(state.accounts.map(a=>({id:a.id,name:a.name})),f.account)+'</select></label><label>Category<select data-filter="category"><option value="all">All</option>'+options(state.categories,f.category)+'</select></label></div>'+(f.range==="custom"?'<div class="split" style="margin-top:10px"><label>From<input type="date" data-filter="from" value="'+f.from+'"></label><label>To<input type="date" data-filter="to" value="'+f.to+'"></label></div>':"")+'</div><div class="flex" style="justify-content:flex-end;margin-bottom:10px"><button class="secondary" id="addCategory">+ Category</button></div><div class="metrics"><div class="metric"><small>Income</small><strong>'+money(income)+'</strong></div><div class="metric"><small>Expenses</small><strong>'+money(out)+'</strong></div></div><div class="card" style="margin-top:15px"><div class="sectionTitle"><h2>'+selected.length+' Transactions</h2><button class="secondary" id="exportCSV">Export CSV</button></div>'+(selected.length?selected.map(t=>row(t.payee_name||nameOf(t.payee_id,state.payees)||t.kind,fmt(t.transaction_date)+" · "+nameOf(t.account_id,state.accounts)+" · "+nameOf(t.category_id,state.categories),'<span class="'+(t.kind==="income"?"positive":"")+'">'+(t.kind==="income"?"+":t.kind==="expense"?"−":"")+money(t.amount)+'</span>','<button class="secondary" data-edit-tx="'+t.id+'">Edit</button>')).join(""):'<p class="empty">No matching transactions.</p>')+'</div>';
}
function billStatus(o){const left=days(o.due_date,today());return o.status==="paid"?"Paid":o.status==="skipped"?"Skipped":left<0?"Overdue":left===0?"Due today":left<=5?"Due in "+left+" days":"Upcoming"}
function renderBills(){
 const list=state.occ.slice().sort((a,b)=>{
  const aa=["unpaid","partial"].includes(a.status),bb=["unpaid","partial"].includes(b.status);
  return (aa===bb?0:aa?-1:1)||a.due_date.localeCompare(b.due_date)||
    String(state.bills.find(x=>x.id===a.bill_id)?.name||"").localeCompare(String(state.bills.find(x=>x.id===b.bill_id)?.name||""),undefined,{sensitivity:"base"});
 });
 let pending=list.filter(o=>!["paid","skipped"].includes(o.status)),sum=pending.filter(o=>days(o.due_date,today())<=30).reduce((s,o)=>s+Math.max(0,Number(o.amount_due)-Number(o.amount_paid)),0);
 $("#bills").innerHTML='<div class="metrics"><div class="metric"><small>Outstanding · Next 30 Days + Overdue</small><strong>'+money(sum)+'</strong></div><div class="metric"><small>Unpaid / Partial Bills</small><strong>'+pending.length+'</strong></div></div><div class="card" style="margin-top:15px"><h2>Bill Schedule</h2>'+(list.length?list.map(o=>{
  const b=state.bills.find(x=>x.id===o.bill_id)||{},remain=Math.max(0,Number(o.amount_due)-Number(o.amount_paid)),status=billStatus(o);
  return '<div class="rowitem"><div><strong>'+esc(b.name||"Bill")+'</strong><small>'+(b.expense_scope==="business"?"Business":"Personal")+' · Due '+fmt(o.due_date)+' · '+esc(b.frequency||"")+'</small><div class="pill '+(status==="Overdue"?"overdue":status==="Paid"?"paid":"")+'">'+status+'</div></div><div class="right"><strong>'+money(remain)+'</strong>'+(["paid","skipped"].includes(o.status)?"":'<button data-pay-bill="'+o.id+'">Record Payment</button>')+'</div></div>';
 }).join(""):'<p class="empty">No bills added yet. Add a recurring bill or a credit-card minimum payment.</p>')+'</div><div class="card"><h2>Bill Pay Accounts</h2>'+alphabetic(state.bills).map(b=>row(b.name,(b.expense_scope==="business"?"Business":"Personal")+" · "+fmt(b.next_due_date)+" · "+b.frequency,money(b.amount_estimate),'<button class="secondary" data-edit-bill="'+b.id+'">Edit</button>')).join("")+'</div><p class="tiny">In-app reminders appear daily beginning five days before a bill is due. iPhone background push notifications require a separate notification service and are not active yet.</p>';
}
function txForReports(month){return state.tx.filter(t=>t.kind==="expense"&&t.transaction_date.slice(0,7)===month)}
function groupFor(month,group){
 const totals={};for(const t of txForReports(month)){
  let lines=state.splits.filter(s=>s.transaction_id===t.id);
  if(group==="payee"){const n=t.payee_name||nameOf(t.payee_id,state.payees)||"Unspecified";totals[n]=(totals[n]||0)+Number(t.amount);}
  else if(lines.length){for(const x of lines){const n=nameOf(x.category_id,state.categories);totals[n]=(totals[n]||0)+Number(x.amount);}}
  else {const n=nameOf(t.category_id,state.categories);totals[n]=(totals[n]||0)+Number(t.amount);}
 }return totals;
}
function renderReports(){
 const dates=state.tx.map(t=>t.transaction_date.slice(0,7)),current=today().slice(0,7);
 const months=[...new Set([current,...dates])].sort().reverse();
 if(!state.report.monthA)state.report.monthA=months[1]||current;
 if(!state.report.monthB)state.report.monthB=current;
 const r=state.report,A=groupFor(r.monthA,r.group),B=groupFor(r.monthB,r.group),keys=[...new Set([...Object.keys(A),...Object.keys(B)])].sort((a,b)=>(B[b]||0)-(B[a]||0));
 const monthOptions=selected=>months.map(m=>'<option value="'+m+'" '+(m===selected?"selected":"")+'>'+new Date(m+"-02T12:00").toLocaleDateString("en-US",{month:"long",year:"numeric"})+'</option>').join("");
 $("#reports").innerHTML='<div class="card"><h2>Monthly Spending Comparison</h2><div class="split"><label>Compare From<select data-report="monthA">'+monthOptions(r.monthA)+'</select></label><label>Compare To<select data-report="monthB">'+monthOptions(r.monthB)+'</select></label></div><label>Group By<select data-report="group"><option value="category" '+(r.group==="category"?"selected":"")+'>Category</option><option value="payee" '+(r.group==="payee"?"selected":"")+'>Payee</option></select></label></div><div class="metrics"><div class="metric"><small>First Month Expenses</small><strong>'+money(Object.values(A).reduce((a,b)=>a+b,0))+'</strong></div><div class="metric"><small>Second Month Expenses</small><strong>'+money(Object.values(B).reduce((a,b)=>a+b,0))+'</strong></div></div><div class="card" style="margin-top:15px"><h2>Comparison by '+(r.group==="payee"?"Payee":"Category")+'</h2>'+(keys.length?keys.map(k=>{
 const a=A[k]||0,b=B[k]||0,delta=b-a,pct=a?Math.round(delta/a*100)+"%":b?"New":"0%";
 return '<div class="rowitem"><div style="flex:1"><strong>'+esc(k)+'</strong><small>'+money(a)+' → '+money(b)+'</small><div class="bar"><span style="width:'+Math.max(0,Math.min(100,100*b/Math.max(...Object.values(B),1)))+'%"></span></div></div><div class="right"><strong class="'+(delta>0?"negative":delta<0?"positive":"")+'">'+(delta>0?"+":"")+money(delta)+'</strong><small>'+pct+'</small></div></div>';
 }).join(""):'<p class="empty">Enter some expenses to see comparisons.</p>')+'</div>';
}
function openEditor(title,markup,handler){
 $("#editorTitle").textContent=title;$("#editorFields").innerHTML=markup;
 $("#editForm").onsubmit=async e=>{e.preventDefault();const btn=$("#saveEditor");btn.disabled=true;try{await handler(new FormData($("#editForm")));$("#editor").close();await load();message("Saved successfully")}catch(err){message(err.message||String(err),true)}finally{btn.disabled=false}};
 $("#editor").showModal();
 // Avoid focusing a small form control and triggering iOS Safari viewport zoom.
 if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();
}
function field(label,name,type="text",value="",more=""){const keyboard=type==="number"?' inputmode="decimal" autocomplete="off"':"";return '<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+keyboard+' '+more+'></label>'}
function selectField(label,name,opts,selected){return '<label>'+esc(label)+'<select name="'+name+'">'+options(opts,selected)+'</select></label>'}
const val=(f,n)=>String(f.get(n)||"").trim();
const numeric=(f,n)=>{const x=Number(val(f,n));if(!Number.isFinite(x)||x<0)throw Error("Enter a valid amount");return Math.round(x*100)/100};
function accountEditor(a=null){
 const types=[{id:"checking",name:"Checking"},{id:"savings",name:"Savings"},{id:"cash",name:"Cash"},{id:"digital_wallet",name:"Digital Wallet"},{id:"credit_card",name:"Credit Card"},{id:"personal_debt",name:"Personal Debt"},{id:"auto_loan",name:"Auto Loan"},{id:"tax_debt",name:"Tax Debt"}];
 const editable=field("Account Name","name","text",a?.name||"","required maxlength=100")+selectField("Account Type","kind",types,a?.kind||"checking");
 const opening=a?"":field("Opening Balance (for debts, enter a negative amount owed)","opening_balance","number","0",'step="0.01" required')+field("Opening Balance Date","opening_date","date",today(),"required");
 const credit=field("Credit Limit (optional)","credit_limit","number",a?.credit_limit??"",'min="0" step="0.01"');
 openEditor(a?"Edit Account":"Add Account",editable+opening+credit+(a?'<p class="tiny">The opening balance and opening date are locked to protect your account history. Record changes using Transactions.</p>':""),async f=>{
  const row={name:val(f,"name"),kind:val(f,"kind"),credit_limit:val(f,"credit_limit")?numeric(f,"credit_limit"):null};
  if(!row.name)throw Error("Enter an account name");
  if(a)await change("finance_accounts",a.id,row);
  else {
   row.opening_balance=Number(val(f,"opening_balance"));
   row.opening_date=val(f,"opening_date");
   if(!Number.isFinite(row.opening_balance)||!row.opening_date)throw Error("Enter a valid opening balance and date");
   await save("finance_accounts",row);
  }
 });
}
function categoryEditor(){
 openEditor("Add Category",field("Category Name","name","text","","required maxlength=100")+selectField("Category Type","kind",[{id:"expense",name:"Expense"},{id:"income",name:"Income"}],"expense"),async f=>{
  const name=val(f,"name"),kind=val(f,"kind");if(!name)throw Error("Enter a category name");await save("finance_categories",{name,kind});
 });
}
function transactionEditor(t=null){
 if(!activeAccounts().length){message("Please add an account first.",true);showTab("accounts");return}
 const acct=activeAccounts().map(a=>({id:a.id,name:a.name})),kinds=[{id:"expense",name:"Expense"},{id:"income",name:"Income"},{id:"transfer",name:"Transfer"},{id:"adjustment",name:"Balance Adjustment"}];
 const cats=state.categories.map(c=>({id:c.id,name:c.name+" ("+c.kind+")"}));
 let existing=state.splits.filter(s=>s.transaction_id===t?.id),splitOpen=existing.length>0;
 const markup=selectField("Transaction Type","kind",kinds,t?.kind||"expense")+field("Amount","amount","number",t?.amount||"",'min="0.01" step="0.01" required')+'<div id="txFromAccount">'+selectField("Account","account_id",[{id:"",name:"Select account"},...acct],t?.account_id||"")+'</div><div id="txToAccount">'+selectField("To Account","destination_account_id",[{id:"",name:"Select destination"},...acct],t?.destination_account_id||"")+'</div><div id="txPayee">'+field("Payee","payee_name","text",t?.payee_name||"",'list="payees" maxlength=150')+'<datalist id="payees">'+alphabetic(state.payees).map(p=>'<option value="'+esc(p.name)+'">').join("")+'</datalist></div><div id="txCategory">'+selectField("Category","category_id",[{id:"",name:"Uncategorized"},...cats],t?.category_id||"")+'</div>'+field("Date","transaction_date","date",t?.transaction_date||today(),"required")+field("Notes","notes","text",t?.notes||"")+'<label class="flex" id="txSplitToggle"><input id="useSplit" type="checkbox" style="width:auto;margin:0" '+(splitOpen?"checked":"")+'> Split expense by category</label><div id="splitFields"></div>';
 openEditor(t?"Edit Transaction":"Add Transaction",markup,async f=>{
 const kind=val(f,"kind"),amount=numeric(f,"amount"),account_id=val(f,"account_id"),dest=val(f,"destination_account_id"),split=$("#useSplit").checked;
 if(!amount)throw Error("Amount must be greater than zero");
 if(!account_id)throw Error("Select an account for this transaction.");
 if(kind==="transfer"&&(!dest||dest===account_id))throw Error("Choose a different destination account");
 if(split&&kind!=="expense")throw Error("Splits are for expenses only");
 let lines=[];if(split){for(const el of document.querySelectorAll(".splitLine")){const id=el.querySelector("select").value,n=Number(el.querySelector("input").value);if(id&&n>0)lines.push({category_id:id,amount:Math.round(n*100)/100});}
 if(Math.round(lines.reduce((s,x)=>s+x.amount,0)*100)!==Math.round(amount*100))throw Error("Split amounts must equal the transaction total");}
 const row={kind,amount,account_id,destination_account_id:kind==="transfer"?dest:null,payee_name:kind==="transfer"?null:val(f,"payee_name")||null,category_id:kind==="transfer"||split?null:val(f,"category_id")||null,transaction_date:val(f,"transaction_date"),description:t?.description||null,notes:val(f,"notes")||null};
 let tx=t?await change("finance_transactions",t.id,row):await save("finance_transactions",row);
 if(t)await api(db.from("finance_transaction_splits").delete().eq("transaction_id",t.id));
 if(lines.length)await api(db.from("finance_transaction_splits").insert(lines.map(x=>({...x,user_id:uid(),transaction_id:tx.id}))));
 if(row.payee_name&&!state.payees.some(p=>p.name.toLowerCase()===row.payee_name.toLowerCase())){await save("finance_payees",{name:row.payee_name})}
 });
 const splitBox=$("#splitFields"),use=$("#useSplit");
 function splitLine(category_id="",amount=""){return '<div class="splitLine split">'+selectField("Category","unused",state.categories.filter(c=>c.kind==="expense").map(c=>({id:c.id,name:c.name})),category_id)+field("Amount","unused","number",amount,'min="0" step="0.01"')+'</div>'}
 function redraw(){splitBox.innerHTML=use.checked?'<p class="tiny">Split amounts must total the transaction amount.</p><div id="splitLines">'+(existing.length?existing.map(x=>splitLine(x.category_id,x.amount)).join(""):splitLine())+'</div><button type="button" id="addSplitLine" class="secondary">+ Add split category</button>':"";const add=$("#addSplitLine");if(add)add.onclick=()=>$("#splitLines").insertAdjacentHTML("beforeend",splitLine())}
 function syncType(){
 const kind=document.querySelector('#editForm [name="kind"]').value;
 const transfer=kind==="transfer",expense=kind==="expense";
 $("#txToAccount").classList.toggle("hidden",!transfer);
 $("#txPayee").classList.toggle("hidden",transfer);
 $("#txCategory").classList.toggle("hidden",transfer);
 $("#txSplitToggle").classList.toggle("hidden",!expense);
 if(!expense)use.checked=false;
 $("#txFromAccount").querySelector("label").firstChild.textContent=transfer?"From Account":"Account";
 redraw();
}
document.querySelector('#editForm [name="kind"]').addEventListener("change",syncType);
use.onchange=redraw;syncType();
}
function billEditor(b=null){
 const acc=activeAccounts().map(a=>({id:a.id,name:a.name})),opts=[{id:"",name:"Select account"},...acc],freq=["once","weekly","biweekly","monthly","yearly"].map(x=>({id:x,name:x[0].toUpperCase()+x.slice(1)}));
 openEditor(b?"Edit Bill":"Add Bill",field("Bill Name","name","text",b?.name||"","required")+'<fieldset class="bill-scope"><legend>Bill For</legend><div class="bill-scope-options"><label><input type="radio" name="expense_scope" value="personal" '+((b?.expense_scope||"personal")==="personal"?"checked":"")+'><span>Personal</span></label><label><input type="radio" name="expense_scope" value="business" '+(b?.expense_scope==="business"?"checked":"")+'><span>Business</span></label></div></fieldset>'+field("Amount Due / Estimate (optional)","amount_estimate","number",Number(b?.amount_estimate)?b.amount_estimate:"",'min="0" step="0.01" placeholder="Leave blank for $0.00"')+field("Next Due Date","next_due_date","date",b?.next_due_date||today(),"required")+selectField("Repeat","frequency",freq,b?.frequency||"monthly")+selectField("Bill Type","bill_kind",[{id:"bill",name:"Regular Bill"},{id:"credit_card_payment",name:"Credit Card Minimum Payment"}],b?.bill_kind||"bill")+selectField("Pay From Account","default_account_id",opts,b?.default_account_id||"")+selectField("Credit Card To Pay (if applicable)","destination_account_id",opts,b?.destination_account_id||"")+selectField("Expense Category","category_id",[{id:"",name:"Uncategorized"},...state.categories.filter(c=>c.kind==="expense")],b?.category_id||"")+field("Notes","notes","text",b?.notes||"")+ '<label class="flex"><input type="checkbox" name="auto_pay" style="width:auto;margin:0" '+(b?.auto_pay?"checked":"")+'> Scheduled automatic payment</label>',async f=>{
 const bill_kind=val(f,"bill_kind"),destination=val(f,"destination_account_id")||null;
 if(bill_kind==="credit_card_payment"&&!destination)throw Error("Select the credit card being paid.");
 const row={name:val(f,"name"),expense_scope:val(f,"expense_scope")||"personal",amount_estimate:numeric(f,"amount_estimate"),next_due_date:val(f,"next_due_date"),frequency:val(f,"frequency"),bill_kind,default_account_id:val(f,"default_account_id")||null,destination_account_id:destination,category_id:val(f,"category_id")||null,notes:val(f,"notes")||null,auto_pay:!!f.get("auto_pay")};
 if(b)await change("finance_bills",b.id,row);
 else {const created=await save("finance_bills",row);await save("finance_bill_occurrences",{bill_id:created.id,due_date:row.next_due_date,amount_due:row.amount_estimate});}
 });
}
function nextDate(date,frequency){
 const d=new Date(date+"T12:00:00");
 if(frequency==="weekly")d.setDate(d.getDate()+7);else if(frequency==="biweekly")d.setDate(d.getDate()+14);else if(frequency==="monthly"){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}else if(frequency==="yearly")d.setFullYear(d.getFullYear()+1);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function payBillEditor(o){
 const b=state.bills.find(x=>x.id===o.bill_id);if(!b)return;
 const acc=activeAccounts().map(a=>({id:a.id,name:a.name})),left=Math.max(0,Number(o.amount_due)-Number(o.amount_paid));
 openEditor("Record Payment — "+b.name,field("Payment Amount","amount","number",left>0?left:"",'min="0.01" step="0.01" required')+field("Payment Date","transaction_date","date",today(),"required")+selectField("Paid From","account_id",acc,b.default_account_id||acc[0]?.id)+field("Notes","notes","text",""),async f=>{
 const amount=numeric(f,"amount");if(amount<=0)throw Error("Enter a positive payment.");
 if(!val(f,"account_id"))throw Error("Choose a payment account.");
 const kind=b.bill_kind==="credit_card_payment"?"transfer":"expense";
 if(kind==="transfer"&&val(f,"account_id")===b.destination_account_id)throw Error("Payment source and credit card must be different.");
 await save("finance_transactions",{kind,amount,transaction_date:val(f,"transaction_date"),account_id:val(f,"account_id"),destination_account_id:kind==="transfer"?b.destination_account_id:null,payee_name:b.name,category_id:kind==="expense"?b.category_id:null,description:"Bill payment",notes:val(f,"notes")||null,bill_occurrence_id:o.id});
 const newPaid=Number(o.amount_paid)+amount,done=newPaid>=Number(o.amount_due)-0.005;
 await change("finance_bill_occurrences",o.id,{amount_paid:Math.round(newPaid*100)/100,status:done?"paid":"partial",paid_at:done?new Date().toISOString():null});
 if(done&&b.active&&b.frequency!=="once"){
   const next=nextDate(o.due_date,b.frequency);
   const exists=state.occ.some(x=>x.bill_id===b.id&&x.due_date===next);
   if(!exists)await save("finance_bill_occurrences",{bill_id:b.id,due_date:next,amount_due:b.amount_estimate});
   await change("finance_bills",b.id,{next_due_date:next});
 }
 });
}
async function removeTransaction(id){if(!confirm("Delete this transaction? Its account balances will be recalculated."))return;try{await api(db.from("finance_transactions").delete().eq("id",id).eq("user_id",uid()));await load();message("Transaction deleted")}catch(e){message(e.message,true)}}
function exportCSV(){
 const records=filterTx(),header=["Date","Type","Payee","Account","Category","Amount","Description"],lines=[header,...records.map(t=>[fmt(t.transaction_date),t.kind,t.payee_name||"",nameOf(t.account_id,state.accounts),nameOf(t.category_id,state.categories),t.amount,t.description||""])];
 const csv=lines.map(r=>r.map(s=>'"'+String(s??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="financetracker-transactions.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.accountView){state.accountView=b.dataset.accountView==="all"||state.accountView===b.dataset.accountView?"all":b.dataset.accountView;renderAccounts();return}
 if(b.dataset.tab){showTab(b.dataset.tab);return}
 if(b.dataset.go){showTab(b.dataset.go);return}
 if(b.id==="addBtn"){state.tab==="accounts"?accountEditor():state.tab==="bills"?billEditor():transactionEditor();return}
 if(b.dataset.editAccount){accountEditor(state.accounts.find(a=>a.id===b.dataset.editAccount));return}
 if(b.dataset.editTx){const t=state.tx.find(x=>x.id===b.dataset.editTx);transactionEditor(t);return}
 if(b.dataset.editBill){billEditor(state.bills.find(x=>x.id===b.dataset.editBill));return}
 if(b.dataset.payBill){payBillEditor(state.occ.find(x=>x.id===b.dataset.payBill));return}
 if(b.id==="exportCSV"){exportCSV();return}
 if(b.id==="addCategory"){categoryEditor();return}
});
document.addEventListener("change",e=>{
 const filter=e.target.dataset.filter,rep=e.target.dataset.report;
 if(filter){state.filter[filter]=e.target.value;renderTransactions();}
 if(rep){state.report[rep]=e.target.value;renderReports();}
});
document.addEventListener("input",e=>{if(e.target.dataset.filter==="payee"){const pos=e.target.selectionStart;state.filter.payee=e.target.value;renderTransactions();const node=document.querySelector('[data-filter="payee"]');node.focus();node.setSelectionRange(pos,pos)}});
$("#closeEditor").onclick=$("#cancelEditor").onclick=()=>{document.activeElement?.blur();$("#editor").close()};


async function openPairCode(){
 const btn=$("#pairGenerate"),out=$("#pairCode"),status=$("#pairMessage");
 btn.disabled=true;status.textContent="Generating a private pairing code…";
 try{
  const code=await api(db.rpc("finance_issue_pair_code"));
  out.textContent=code;
  status.textContent="Enter this code on your other device within 10 minutes. It can be used only once.";
 }catch(e){status.textContent=e.message}finally{btn.disabled=false}
}
// Keep pairing available through a private setup URL, but hide it in normal use.
if(new URLSearchParams(window.location.search).get("devices")==="1")$("#devicePairing").classList.remove("hidden");
// Tap the version footer to reveal recovery controls from an already connected device.
$("footer").addEventListener("click",()=>{$("#devicePairing").classList.toggle("hidden");if(!$("#devicePairing").classList.contains("hidden"))$("#devicePairing").scrollIntoView({behavior:"smooth",block:"start"});});
$("#pairGenerate").onclick=openPairCode;
$("#pairRedeemForm").onsubmit=async e=>{
 e.preventDefault();
 const btn=$("#pairRedeemForm button[type=submit]"),status=$("#pairMessage");
 btn.disabled=true;status.textContent="Connecting this device…";
 try{
  const owner=await api(db.rpc("finance_redeem_pair_code",{p_code:$("#pairInput").value.trim()}));
  if(!owner)throw Error("Invalid, expired, or unavailable code. Make sure this device has no existing financial entries and try a fresh code.");
  state.ownerId=owner;
  $("#pairInput").value="";
  $("#pairCode").textContent="—";
  await load();
  status.textContent="Connected! This device now uses the same records.";
 }catch(e){status.textContent=e.message}finally{btn.disabled=false}
};
async function start(){

 try{
  const {data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError)throw sessionError;
  let active=session;
  if(!active){
   const {data,error}=await db.auth.signInAnonymously();
   if(error)throw error;
   active=data.session;
  }
  state.user=active?.user||null;
  if(!state.user?.id)throw Error("No session was returned.");
  state.ownerId=await api(db.rpc("finance_owner_id"));
  await load();
 }catch(e){
  state.user=null;
  state.ownerId=null;
  $("#initialLoading")?.remove();
  const details=/anonymous|disabled|not allowed/i.test(e.message)
   ?"Automatic access needs Anonymous Sign-Ins enabled in Supabase Authentication settings. No email is required.":e.message;
  const warning=$("#message");
  warning.textContent="Unable to load your accounts: "+details;
  warning.className="notice error";
 }
}
db.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_IN"&&session?.user?.id!==uid()){
  state.user=session.user;
  setTimeout(async()=>{try{state.ownerId=await api(db.rpc("finance_owner_id"));await load()}catch(e){message(e.message,true)}},0)
 }
 if(event==="SIGNED_OUT"){state.user=null;state.ownerId=null;const warning=$("#message");warning.textContent="The connection ended. Reopen Finance Tracker to reconnect.";warning.className="notice error";}
});
start();
