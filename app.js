const DAYS = ["الجمعة","الخميس","الأربعاء","الثلاثاء","الاثنين","الأحد","السبت"];
const KEY = "studyPlannerWebV1";

let state = loadState();
let editingTaskId = null;

const $ = id => document.getElementById(id);

function defaultState() {
  return {
    setupDone:false, wake:"07:00", end:"22:00",
    bg:"#f7d8e8", cells:{}, tasks:[]
  };
}
function loadState() {
  try { return {...defaultState(), ...JSON.parse(localStorage.getItem(KEY) || "{}")}; }
  catch { return defaultState(); }
}
function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
  $("saveStatus").textContent = "تم الحفظ";
  setTimeout(() => $("saveStatus").textContent = "جاهز", 1200);
}
function timeToMinutes(t) {
  const [h,m] = t.split(":").map(Number); return h*60+m;
}
function minutesToTime(x) {
  x %= 1440; const h=Math.floor(x/60), m=x%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}
function buildTimes() {
  let a=timeToMinutes(state.wake), b=timeToMinutes(state.end);
  if (b <= a) b += 1440;
  const out=[];
  for (let t=a; t<b; t+=60) out.push(minutesToTime(t));
  return out;
}
function renderSchedule() {
  const wrap=$("schedule"); wrap.innerHTML="";
  const times=buildTimes();
  const grid=document.createElement("div"); grid.className="schedule";
  grid.style.gridTemplateRows=`48px repeat(${times.length}, 62px)`;
  addCell(grid,"الوقت","header-cell");
  DAYS.forEach(d=>addCell(grid,d,"cell header-cell"));
  times.forEach(time=>{
    addCell(grid,time,"cell time-cell");
    DAYS.forEach(day=>{
      const key=`${day}|${time}`;
      const c=addCell(grid,state.cells[key]||"","cell");
      c.contentEditable="true";
      c.dataset.key=key;
      c.addEventListener("input",()=>{state.cells[key]=c.innerText; saveState();});
      c.addEventListener("blur",()=>{state.cells[key]=c.innerText; saveState();});
    });
  });
  wrap.appendChild(grid);
  $("routineInfo").textContent=`من ${state.wake} إلى ${state.end}`;
}
function addCell(parent,text,cls) {
  const d=document.createElement("div"); d.className=cls; d.textContent=text; parent.appendChild(d); return d;
}
function renderTasks() {
  const list=$("tasksList"); list.innerHTML="";
  if (!state.tasks.length) { list.innerHTML='<div class="empty">لا توجد مهام بعد. ابدأ بإضافة مهمتك الأولى 🌷</div>'; return; }
  [...state.tasks].sort((a,b)=>(a.time||"").localeCompare(b.time||"")).forEach(task=>{
    const el=document.createElement("div"); el.className="task"+(task.done?" done":"");
    el.innerHTML=`
      <input type="checkbox" ${task.done?"checked":""} aria-label="إنجاز المهمة">
      <div class="task-main">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">${task.day||"بدون يوم"} ${task.time?"• "+task.time:""} • الأولوية: ${task.priority}</div>
      </div>
      <div class="task-actions">
        <button class="small edit">تعديل</button>
        <button class="small delete">حذف</button>
      </div>`;
    el.querySelector("input").onchange=()=>{task.done=!task.done;saveState();renderTasks();};
    el.querySelector(".edit").onclick=()=>openTaskModal(task.id);
    el.querySelector(".delete").onclick=()=>{if(confirm("هل تريد حذف هذه المهمة؟")){state.tasks=state.tasks.filter(x=>x.id!==task.id);saveState();renderTasks();}};
    list.appendChild(el);
  });
}
function escapeHtml(s="") {
  return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function fillDays() {
  $("taskDay").innerHTML=DAYS.map(d=>`<option>${d}</option>`).join("");
}
function openTaskModal(id=null) {
  editingTaskId=id;
  const task=id ? state.tasks.find(x=>x.id===id) : null;
  $("taskModalTitle").textContent=task?"تعديل المهمة":"إضافة مهمة";
  $("taskTitle").value=task?.title||"";
  $("taskDay").value=task?.day||DAYS[0];
  $("taskTime").value=task?.time||state.wake;
  $("taskPriority").value=task?.priority||"متوسطة";
  $("taskModal").classList.remove("hidden");
  $("taskTitle").focus();
}
function closeTaskModal() { $("taskModal").classList.add("hidden"); editingTaskId=null; }

function setup() {
  document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active"); $(btn.dataset.tab+"Tab").classList.add("active");
  });
  $("saveBtn").onclick=saveState;
  $("colorBtn").onclick=()=>{
    const input=document.createElement("input"); input.type="color"; input.value=state.bg;
    input.onchange=()=>{state.bg=input.value;document.body.style.background=state.bg;saveState();}; input.click();
  };
  $("settingsBtn").onclick=()=>{
    $("wakeInput").value=state.wake; $("endInput").value=state.end;
    $("setupModal").classList.remove("hidden");
  };
  $("startBtn").onclick=()=>{
    const wake=$("wakeInput").value, end=$("endInput").value;
    if(!wake||!end){alert("يرجى اختيار الوقتين.");return;}
    state.wake=wake; state.end=end; state.setupDone=true; saveState();
    $("setupModal").classList.add("hidden"); renderSchedule();
  };
  $("addTaskBtn").onclick=()=>openTaskModal();
  $("closeTaskBtn").onclick=closeTaskModal;
  $("saveTaskBtn").onclick=()=>{
    const title=$("taskTitle").value.trim();
    if(!title){alert("اكتب اسم المهمة أولاً.");return;}
    const data={title,day:$("taskDay").value,time:$("taskTime").value,priority:$("taskPriority").value,done:false};
    if(editingTaskId){
      const t=state.tasks.find(x=>x.id===editingTaskId); Object.assign(t,data);
    } else { state.tasks.push({id:Date.now(),...data}); }
    saveState(); renderTasks(); closeTaskModal();
  };
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveState();}});
  document.body.style.background=state.bg;
  fillDays(); renderSchedule(); renderTasks();
  if(!state.setupDone) $("setupModal").classList.remove("hidden");
}
setup();
