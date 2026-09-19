const DAYS = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت"
];

const STORAGE_KEY = "studyPlannerWebV2";

let state = loadState();

let editingTaskId = null;

let currentMobileDay = 0;

let deferredInstall = null;


const $ = id =>
    document.getElementById(id);


function defaultState() {

    return {

        setupDone: false,

        wake: "07:00",

        end: "22:00",

        bg: "#f7d8e8",

        cells: {},

        tasks: [],

        habits: []

    };

}


function loadState() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            return defaultState();

        }

        return {

            ...defaultState(),

            ...JSON.parse(saved)

        };

    }

    catch {

        return defaultState();

    }

}


function saveState() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(state)

    );

    $("saveStatus").textContent =
        "تم الحفظ";


    updateStats();


    setTimeout(() => {

        $("saveStatus").textContent =
            "جاهز";

    }, 1200);

}


function timeToMinutes(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    return hours * 60 + minutes;

}


function minutesToTime(minutes) {

    minutes %= 1440;

    return (

        String(
            Math.floor(minutes / 60)
        ).padStart(2, "0")

        +

        ":"

        +

        String(
            minutes % 60
        ).padStart(2, "0")

    );

}


function buildTimes() {

    let start =
        timeToMinutes(state.wake);

    let end =
        timeToMinutes(state.end);


    if (end <= start) {

        end += 1440;

    }


    const times = [];


    for (
        let time = start;
        time < end;
        time += 60
    ) {

        times.push(
            minutesToTime(time)
        );

    }


    return times;

}


function addCell(
    parent,
    text,
    className
) {

    const element =
        document.createElement("div");

    element.className =
        className;

    element.textContent =
        text;

    parent.appendChild(element);

    return element;

}


function renderSchedule() {

    const wrap =
        $("schedule");

    wrap.innerHTML = "";


    const times =
        buildTimes();


    const grid =
        document.createElement("div");

    grid.className =
        "schedule";


    addCell(
        grid,
        "الوقت",
        "cell header-cell"
    );


    DAYS.forEach((day, index) => {

        const cell =
            addCell(
                grid,
                day,
                "cell header-cell"
            );

        cell.dataset.dayIndex =
            index;

        if (
            index === currentMobileDay
        ) {

            cell.classList.add(
                "mobile-day"
            );

        }

    });


    times.forEach(time => {

        const timeCell =
            addCell(
                grid,
                time,
                "cell time-cell mobile-visible"
            );


        DAYS.forEach(
            (day, index) => {

                const key =
                    `${day}|${time}`;


                const cell =
                    addCell(
                        grid,
                        state.cells[key] || "",
                        "cell"
                    );


                cell.contentEditable =
                    "true";


                cell.dataset.key =
                    key;


                if (
                    index === currentMobileDay
                ) {

                    cell.classList.add(
                        "mobile-visible"
                    );

                }


                cell.addEventListener(
                    "input",
                    () => {

                        state.cells[key] =
                            cell.innerText;

                        saveState();

                    }
                );


                cell.addEventListener(
                    "blur",
                    () => {

                        state.cells[key] =
                            cell.innerText;

                        saveState();

                    }
                );

            }
        );

    });


    wrap.appendChild(grid);


    $("routineInfo").textContent =
        `من ${state.wake} إلى ${state.end}`;


    $("mobileDayName").textContent =
        DAYS[currentMobileDay];

}


function escapeHtml(text = "") {

    return text.replace(
        /[&<>"']/g,

        character => {

            const map = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"

            };

            return map[character];

        }
    );

}


function renderTasks() {

    const list =
        $("tasksList");

    list.innerHTML = "";


    if (
        state.tasks.length === 0
    ) {

        list.innerHTML = `

            <div class="empty">

                لا توجد مهام بعد.
                أضف أول مهمة لك.

            </div>

        `;

        return;

    }


    state.tasks.forEach(task => {

        const element =
            document.createElement("div");

        element.className =
            "task";


        if (task.done) {

            element.classList.add(
                "done"
            );

        }


        element.innerHTML = `

            <input
                type="checkbox"
                ${task.done ? "checked" : ""}>

            <div class="task-main">

                <div class="task-title">

                    ${escapeHtml(
                        task.title
                    )}

                </div>

                <div class="task-meta">

                    ${task.day}

                    ${task.time
                        ? " • " + task.time
                        : ""}

                    • الأولوية:
                    ${task.priority}

                </div>

            </div>


            <div class="task-actions">

                <button class="small edit">
                    تعديل
                </button>

                <button class="small delete">
                    حذف
                </button>

            </div>

        `;


        element.querySelector(
            "input"
        ).onchange = event => {

            task.done =
                event.target.checked;

            saveState();

            renderTasks();

        };


        element.querySelector(
            ".edit"
        ).onclick = () => {

            openTaskModal(task.id);

        };


        element.querySelector(
            ".delete"
        ).onclick = () => {

            if (
                confirm(
                    "هل تريد حذف هذه المهمة؟"
                )
            ) {

                state.tasks =
                    state.tasks.filter(
                        item =>
                            item.id !== task.id
                    );

                saveState();

                renderTasks();

            }

        };


        list.appendChild(element);

    });

}


function renderHabits() {

    const list =
        $("habitsList");

    list.innerHTML = "";


    if (
        state.habits.length === 0
    ) {

        list.innerHTML = `

            <div class="empty">

                لا توجد عادات بعد.
                أضف عادة دراسية صغيرة وابدأ بالاستمرار.

            </div>

        `;

        return;

    }


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);


    state.habits.forEach(habit => {

        const done =
            habit.doneDate === today;


        const element =
            document.createElement("div");

        element.className =
            "habit";


        element.innerHTML = `

            <input
                class="habit-check"
                type="checkbox"
                ${done ? "checked" : ""}>

            <div class="habit-main">

                <div class="habit-title">

                    ${escapeHtml(
                        habit.title
                    )}

                </div>

                <div class="habit-count">

                    أيام مكتملة:
                    ${habit.count || 0}

                </div>

            </div>

            <button class="small delete">
                حذف
            </button>

        `;


        element.querySelector(
            ".habit-check"
        ).onchange = event => {

            const today =
                new Date()
                    .toISOString()
                    .slice(0, 10);


            if (
                event.target.checked &&
                !done
            ) {

                habit.count =
                    (habit.count || 0) + 1;

                habit.doneDate =
                    today;

            }

            else if (
                !event.target.checked &&
                done
            ) {

                habit.count =
                    Math.max(
                        0,
                        (habit.count || 0) - 1
                    );

                habit.doneDate = "";

            }


            saveState();

            renderHabits();

        };


        element.querySelector(
            ".delete"
        ).onclick = () => {

            if (
                confirm(
                    "هل تريد حذف هذه العادة؟"
                )
            ) {

                state.habits =
                    state.habits.filter(
                        item =>
                            item.id !== habit.id
                    );

                saveState();

                renderHabits();

            }

        };


        list.appendChild(element);

    });

}


function updateStats() {

    const total =
        state.tasks.length;


    const done =
        state.tasks.filter(
            task => task.done
        ).length;


    const pending =
        total - done;


    const percentage =
        total
            ? Math.round(
                done / total * 100
            )
            : 0;


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);


    const habitTotal =
        state.habits.length;


    const habitDone =
        state.habits.filter(
            habit =>
                habit.doneDate === today
        ).length;


    const habitPercentage =
        habitTotal
            ? Math.round(
                habitDone /
                habitTotal *
                100
            )
            : 0;


    $("statTasks").textContent =
        total;


    $("statDone").textContent =
        done;


    $("statPending").textContent =
        pending;


    $("statHabits").textContent =
        habitPercentage + "%";


    $("progressText").textContent =
        percentage + "%";


    $("progressBar").style.width =
        percentage + "%";

}


function fillDays() {

    $("taskDay").innerHTML =
        DAYS.map(day => {

            return `

                <option value="${day}">
                    ${day}
                </option>

            `;

        }).join("");

}


function openTaskModal(id = null) {

    editingTaskId = id;


    const task =
        id
            ? state.tasks.find(
                item =>
                    item.id === id
            )
            : null;


    $("taskModalTitle").textContent =
        task
            ? "تعديل المهمة"
            : "إضافة مهمة";


    $("taskTitle").value =
        task?.title || "";


    $("taskDay").value =
        task?.day ||
        DAYS[currentMobileDay];


    $("taskTime").value =
        task?.time ||
        state.wake;


    $("taskPriority").value =
        task?.priority ||
        "متوسطة";


    $("taskModal")
        .classList
        .remove("hidden");


    $("taskTitle").focus();

}


function closeTaskModal() {

    $("taskModal")
        .classList
        .add("hidden");

    editingTaskId = null;

}


/* التبويبات */

document
    .querySelectorAll(".tab")
    .forEach(button => {

        button.onclick = () => {

            document
                .querySelectorAll(".tab")
                .forEach(tab => {

                    tab.classList.remove(
                        "active"
                    );

                });


            document
                .querySelectorAll(
                    ".tab-panel"
                )
                .forEach(panel => {

                    panel.classList.remove(
                        "active"
                    );

                });


            button.classList.add(
                "active"
            );


            $(
                button.dataset.tab +
                "Tab"
            )
                .classList
                .add("active");


            updateStats();

        };

    });


/* الحفظ */

$("saveBtn").onclick =
    saveState;


/* تغيير اللون */

$("colorBtn").onclick =
    () => {

        const picker =
            document.createElement(
                "input"
            );

        picker.type = "color";

        picker.value =
            state.bg;


        picker.onchange = () => {

            state.bg =
                picker.value;

            document.body.style.background =
                state.bg;

            saveState();

        };


        picker.click();

    };


/* الإعدادات */

$("settingsBtn").onclick =
    () => {

        $("wakeInput").value =
            state.wake;

        $("endInput").value =
            state.end;

        $("setupModal")
            .classList
            .remove("hidden");

    };


/* بدء التخطيط */

$("startBtn").onclick =
    () => {

        const wake =
            $("wakeInput").value;

        const end =
            $("endInput").value;


        if (!wake || !end) {

            alert(
                "يرجى اختيار الوقتين."
            );

            return;

        }


        state.wake =
            wake;

        state.end =
            end;

        state.setupDone =
            true;


        saveState();


        $("setupModal")
            .classList
            .add("hidden");


        renderSchedule();

    };


/* إضافة مهمة */

$("addTaskBtn").onclick =
    () => {

        openTaskModal();

    };


/* إضافة مهمة سريعة */

$("quickAddBtn").onclick =
    () => {

        const input =
            $("quickTaskInput");


        const title =
            input.value.trim();


        if (!title) {

            return;

        }


        state.tasks.push({

            id: Date.now(),

            title: title,

            day:
                DAYS[currentMobileDay],

            time:
                state.wake,

            priority:
                "متوسطة",

            done:
                false

        });


        input.value = "";


        saveState();

        renderTasks();

    };


$("quickTaskInput")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                $("quickAddBtn").click();

            }

        }
    );


/* إغلاق المهمة */

$("closeTaskBtn").onclick =
    closeTaskModal;


/* حفظ المهمة */

$("saveTaskBtn").onclick =
    () => {

        const title =
            $("taskTitle")
                .value
                .trim();


        if (!title) {

            alert(
                "اكتب اسم المهمة أولاً."
            );

            return;

        }


        const data = {

            title,

            day:
                $("taskDay").value,

            time:
                $("taskTime").value,

            priority:
                $("taskPriority").value

        };


        if (editingTaskId) {

            const task =
                state.tasks.find(
                    item =>
                        item.id ===
                        editingTaskId
                );


            if (task) {

                Object.assign(
                    task,
                    data
                );

            }

        }

        else {

            state.tasks.push({

                id: Date.now(),

                ...data,

                done: false

            });

        }


        saveState();

        renderTasks();

        closeTaskModal();

    };


/* إضافة عادة */

$("addHabitBtn").onclick =
    () => {

        $("habitTitle").value =
            "";

        $("habitModal")
            .classList
            .remove("hidden");

        $("habitTitle").focus();

    };


$("closeHabitBtn").onclick =
    () => {

        $("habitModal")
            .classList
            .add("hidden");

    };


$("saveHabitBtn").onclick =
    () => {

        const title =
            $("habitTitle")
                .value
                .trim();


        if (!title) {

            alert(
                "اكتب اسم العادة أولاً."
            );

            return;

        }


        state.habits.push({

            id: Date.now(),

            title,

            count: 0,

            doneDate: ""

        });


        saveState();

        renderHabits();


        $("habitModal")
            .classList
            .add("hidden");

    };


/* التنقل بين أيام الهاتف */

$("prevDayBtn").onclick =
    () => {

        currentMobileDay =
            (currentMobileDay + 6) % 7;

        renderSchedule();

    };


$("nextDayBtn").onclick =
    () => {

        currentMobileDay =
            (currentMobileDay + 1) % 7;

        renderSchedule();

    };


/* اختصار الحفظ */

document.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey ||
             event.metaKey) &&
            event.key.toLowerCase() === "s"
        ) {

            event.preventDefault();

            saveState();

        }

    }
);


/* تشغيل التطبيق */

document.body.style.background =
    state.bg;


fillDays();

renderSchedule();

renderTasks();

renderHabits();

updateStats();


if (!state.setupDone) {

    $("setupModal")
        .classList
        .remove("hidden");

}


/* تثبيت التطبيق */

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredInstall =
            event;

        $("installBtn")
            .classList
            .remove("hidden");

    }
);


$("installBtn").onclick =
    async () => {

        if (!deferredInstall) {
            return;
        }

        deferredInstall.prompt();

        await deferredInstall.userChoice;

        deferredInstall = null;

        $("installBtn")
            .classList
            .add("hidden");

    };