import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  GraduationCap,
  Heart,
  Timer,
  ChartNoAxesColumn,
  Settings as SettingsIcon,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Check,
  ArrowRight,
  Sun,
  Moon,
  Download,
  Upload,
  X,
  Play,
  Pause,
  RotateCcw,
  Menu,
  Archive,
  Copy,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  load,
  save,
  initial,
  uid,
  today,
  dateLabel,
  suggestions,
  priorityLabel,
  statusLabel,
  validateImport,
  normalizeState,
  type State,
  type Task,
  type Event,
  type Subject,
  type Project,
  type Exam,
  type StudyTemplate,
} from "./data";
type Page =
  | "space"
  | "inbox"
  | "tasks"
  | "calendar"
  | "projects"
  | "studies"
  | "personal"
  | "focus"
  | "progress"
  | "settings"
  | "weekly"
  | "overwhelmed";
const nav: [Page, string, any][] = [
  ["space", "Mi espacio", LayoutDashboard],
  ["inbox", "Bandeja de entrada", Inbox],
  ["tasks", "Mis tareas", CheckSquare],
  ["calendar", "Calendario", CalendarDays],
  ["projects", "Proyectos", FolderKanban],
  ["studies", "Estudios", GraduationCap],
  ["personal", "Mi vida personal", Heart],
  ["focus", "Concentración", Timer],
  ["progress", "Mi progreso", ChartNoAxesColumn],
  ["settings", "Ajustes", SettingsIcon],
];
const blankTask = (): Task => ({
  id: uid(),
  title: "",
  description: "",
  area: "study",
  status: "pending",
  priority: "medium",
  minutes: 30,
  createdAt: new Date().toISOString(),
  subtasks: [],
  tags: [],
});
const blankEvent = (): Event => ({
  id: uid(),
  title: "",
  date: today(),
  allDay: true,
  type: "personal",
  notes: "",
});
const blankExam = (): Exam => ({
  id: uid(),
  title: "",
  date: today(),
  notes: "",
  preparation: 1,
  topics: [],
});
const blankTemplate = (): StudyTemplate => ({
  id: uid(),
  name: "",
  description: "",
  kind: "custom",
  steps: [],
});
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalHead">
          <h2>{title}</h2>
          <button className="iconBtn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<State>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [page, setPage] = useState<Page>("space"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<
      | "task"
      | "event"
      | "project"
      | "subject"
      | "exam"
      | "template"
      | "note"
      | "add"
      | null
    >(null),
    [editing, setEditing] = useState<any>(null),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [taskView, setTaskView] = useState<"list" | "kanban">("list"),
    [taskFilter, setTaskFilter] = useState("open"),
    [areaFilter, setAreaFilter] = useState("all"),
    [projectFilter, setProjectFilter] = useState(""),
    [calendarDate, setCalendarDate] = useState(new Date()),
    [calendarView, setCalendarView] = useState<
      "month" | "week" | "day" | "agenda"
    >("month"),
    [focusTask, setFocusTask] = useState(""),
    [focusLength, setFocusLength] = useState(25),
    [seconds, setSeconds] = useState(1500),
    [running, setRunning] = useState(false),
    [overIndex, setOverIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastSaved = useRef<State | null>(null);
  const storageLoaded = useRef(false);
  useEffect(() => {
    load()
      .then((s) => {
        storageLoaded.current = true;
        setData(s);
        setPage((s.settings.home as Page) || "space");
        setReady(true);
      })
      .catch(() => {
        setError(
          "No se pudieron cargar los datos. Comprueba el almacenamiento del navegador.",
        );
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!ready || !storageLoaded.current) return;
    save(data).catch(() =>
      setError(
        "No se pudieron guardar los cambios. Exporta una copia de seguridad.",
      ),
    );
  }, [data, ready]);
  useEffect(() => {
    if (!running) return;
    const i = window.setInterval(
      () =>
        setSeconds((n) => {
          if (n <= 1) {
            setRunning(false);
            setData((d) => ({
              ...d,
              sessions: [
                ...d.sessions,
                {
                  id: uid(),
                  taskId: focusTask || undefined,
                  minutes: focusLength,
                  at: new Date().toISOString(),
                },
              ],
            }));
            setToast(
              "Sesión registrada. ¿Quieres continuar o completar la tarea?",
            );
            return 0;
          }
          return n - 1;
        }),
      1000,
    );
    return () => clearInterval(i);
  }, [running, focusTask, focusLength]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key === "n" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setEditing(null);
        setModal("add");
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const change = (f: (s: State) => State, msg?: string) => {
    lastSaved.current = data;
    setData(f);
    if (msg) setToast(msg);
  };
  const updateTask = (task: Task) =>
    change(
      (s) => ({
        ...s,
        tasks: s.tasks.some((t) => t.id === task.id)
          ? s.tasks.map((t) => (t.id === task.id ? task : t))
          : [...s.tasks, task],
      }),
      "Tarea guardada",
    );
  const liveTasks = data.tasks.filter((t) => !t.deletedAt);
  const openTasks = liveTasks.filter((t) => t.status !== "done");
  const upcoming = [
    ...openTasks
      .filter((t) => t.due)
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.due!,
        kind: "Tarea",
        area: t.area,
      })),
    ...data.events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.slice(0, 10),
      kind: e.type === "exam" ? "Examen" : "Evento",
      area: e.type === "personal" ? "personal" : "study",
    })),
    ...data.exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      date: exam.date.slice(0, 10),
      kind: "Examen",
      area: "study" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const subjectName = (id?: string) =>
    data.subjects.find((s) => s.id === id)?.name;
  const projectName = (id?: string) =>
    data.projects.find((p) => p.id === id)?.name;
  const go = (p: Page) => {
    setPage(p);
    setMobile(false);
    window.scrollTo(0, 0);
  };
  const openModal = (kind: typeof modal, item?: any) => {
    setEditing(item || null);
    setModal(kind);
  };
  const taskRow = (t: Task) => (
    <div className="taskRow" key={t.id}>
      <button
        className={"checkCircle " + (t.status === "done" ? "checked" : "")}
        onClick={() =>
          updateTask({
            ...t,
            status: t.status === "done" ? "pending" : "done",
            completedAt:
              t.status === "done" ? undefined : new Date().toISOString(),
          })
        }
        aria-label={t.status === "done" ? "Reabrir tarea" : "Completar tarea"}
      >
        {t.status === "done" && <Check size={14} />}
      </button>
      <div
        className="taskBody"
        onClick={() => openModal("task", t)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && openModal("task", t)}
      >
        <strong className={t.status === "done" ? "strike" : ""}>
          {t.title}
        </strong>
        <small>
          {subjectName(t.subjectId) ||
            projectName(t.projectId) ||
            (t.area === "personal" ? "Personal" : "Estudios")}
          {t.due ? " · " + dateLabel(t.due) : ""}
          {t.minutes ? " · " + t.minutes + " min" : ""}
        </small>
      </div>
      <span className={"priority " + t.priority}>
        {priorityLabel[t.priority]}
      </span>
      <button
        className="iconBtn"
        onClick={() => openModal("task", t)}
        aria-label={"Editar " + t.title}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
  const top = (
    <div className="topbar">
      <button
        className="iconBtn mobileMenu"
        onClick={() => setMobile(!mobile)}
        aria-label="Abrir navegación"
      >
        <Menu />
      </button>
      <div className="breadcrumbs">
        CLARO <span>/</span>{" "}
        {nav.find((x) => x[0] === page)?.[1] || "Mi espacio"}
      </div>
      <div className="topActions">
        <button className="searchBtn" onClick={() => setSearchOpen(true)}>
          <Search size={18} />
          <span>Buscar en CLARO</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="primaryBtn addTop" onClick={() => openModal("add")}>
          <Plus size={18} /> Añadir
        </button>
      </div>
    </div>
  );
  const overview = () => {
    const suggested = suggestions(openTasks);
    const chosen = data.priorities
      .map((id) => openTasks.find((t) => t.id === id))
      .filter(Boolean) as Task[];
    const priorities = chosen.length ? chosen : suggested;
    return (
      <>
        <div className="hero">
          <div className="eyebrow">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <h1>
            {new Date().getHours() < 13
              ? "Buenos días"
              : new Date().getHours() < 20
                ? "Buenas tardes"
                : "Buenas noches"}
            . Vamos a poner un poco de orden.
          </h1>
          <p>Un paso cada vez. Aquí tienes lo que importa ahora.</p>
          <button className="textLink" onClick={() => go("overwhelmed")}>
            No sé por dónde empezar <ArrowRight size={15} />
          </button>
        </div>
        <div className="sectionHead">
          <div>
            <span className="eyebrow">ENFOQUE DE HOY</span>
            <h2>Mis tres prioridades</h2>
          </div>
          <button className="subtleBtn" onClick={() => go("tasks")}>
            Ver mis tareas <ArrowRight size={16} />
          </button>
        </div>
        <div className="priorityGrid">
          {priorities.length ? (
            priorities.slice(0, 3).map((t, i) => (
              <article className="priorityCard" key={t.id}>
                <div className="cardTop">
                  <span className="number">0{i + 1}</span>
                  <button
                    className="iconBtn"
                    onClick={() =>
                      change(
                        (s) => ({
                          ...s,
                          priorities: s.priorities.filter((id) => id !== t.id),
                        }),
                        "Prioridad retirada",
                      )
                    }
                    aria-label="Quitar prioridad"
                  >
                    <X size={16} />
                  </button>
                </div>
                <span className="pill">
                  {subjectName(t.subjectId) ||
                    projectName(t.projectId) ||
                    (t.area === "personal" ? "Personal" : "Estudios")}
                </span>
                <h3 onClick={() => openModal("task", t)}>{t.title}</h3>
                <p>
                  {t.due ? `Para el ${dateLabel(t.due)} · ` : ""}
                  {t.minutes} min · {statusLabel[t.status]}
                </p>
                <button
                  className="cardAction"
                  onClick={() => {
                    setFocusTask(t.id);
                    go("focus");
                  }}
                >
                  Empezar <ArrowRight size={17} />
                </button>
              </article>
            ))
          ) : (
            <div className="empty wide">
              <span className="emptyIcon">
                <CheckSquare />
              </span>
              <h3>Un espacio despejado</h3>
              <p>
                Añade una tarea cuando tengas algo pendiente. Tus prioridades
                aparecerán aquí.
              </p>
              <button className="subtleBtn" onClick={() => openModal("task")}>
                Crear tarea
              </button>
            </div>
          )}
        </div>
        {!chosen.length && suggested.length > 0 && (
          <p className="hint">
            Sugerencias según fecha, prioridad y estado. Puedes elegir tus
            prioridades desde Mis tareas.
          </p>
        )}
        <div className="dashboardGrid">
          <section className="panel">
            <div className="panelHead">
              <div>
                <span className="eyebrow">A LA VISTA</span>
                <h2>Próximamente</h2>
              </div>
              <button
                className="iconBtn"
                onClick={() => go("calendar")}
                aria-label="Ir al calendario"
              >
                <ArrowRight size={19} />
              </button>
            </div>
            {upcoming.length ? (
              upcoming.slice(0, 5).map((x) => (
                <div className="upcoming" key={x.kind + x.id}>
                  <span
                    className={
                      "dateBlock " + (x.date < today() ? "overdue" : "")
                    }
                  >
                    <b>{x.date === today() ? "Hoy" : dateLabel(x.date)}</b>
                  </span>
                  <div>
                    <strong>{x.title}</strong>
                    <small>
                      {x.kind} ·{" "}
                      {x.area === "personal" ? "Personal" : "Estudios"}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted spacious">No tienes nada urgente para hoy.</p>
            )}
          </section>
          <section className="panel">
            <div className="panelHead">
              <div>
                <span className="eyebrow">RETOMAR</span>
                <h2>Continuar donde lo dejé</h2>
              </div>
            </div>
            {openTasks.filter((t) => t.status === "progress").length ? (
              openTasks
                .filter((t) => t.status === "progress")
                .slice(0, 4)
                .map(taskRow)
            ) : (
              <p className="muted spacious">
                Cuando empieces una tarea, la encontrarás aquí.
              </p>
            )}
            <div className="weekStrip">
              {Array.from({ length: 7 }, (_, i) =>
                addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i),
              ).map((d, i) => (
                <button
                  key={i}
                  className={
                    "weekDay " + (isSameDay(d, new Date()) ? "current" : "")
                  }
                  onClick={() => {
                    setCalendarDate(d);
                    go("calendar");
                  }}
                >
                  <small>{format(d, "EEEEE", { locale: es })}</small>
                  <b>{format(d, "d")}</b>
                  <i
                    className={
                      upcoming.some((x) => x.date === format(d, "yyyy-MM-dd"))
                        ? "hasEvent"
                        : ""
                    }
                  />
                </button>
              ))}
            </div>
          </section>
        </div>
        {data.settings.showSummary && (
          <div className="stats">
            {[
              [
                "Completadas esta semana",
                liveTasks.filter(
                  (t) =>
                    t.completedAt &&
                    new Date(t.completedAt) >=
                      startOfWeek(new Date(), { weekStartsOn: 1 }),
                ).length,
              ],
              [
                "En curso",
                openTasks.filter((t) => t.status === "progress").length,
              ],
              [
                "Próximas entregas",
                openTasks.filter((t) => t.due && t.due >= today()).length,
              ],
              [
                "Proyectos activos",
                data.projects.filter((p) => p.status === "active").length,
              ],
            ].map(([label, count]) => (
              <div key={label}>
                <strong>{count}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };
  const tasksPage = () => {
    let list = (
      taskFilter === "trash" ? data.tasks.filter((t) => t.deletedAt) : liveTasks
    ).filter((t) =>
      taskFilter === "trash"
        ? true
        : taskFilter === "all"
          ? true
          : taskFilter === "done"
            ? t.status === "done"
            : taskFilter === "undated"
              ? !t.due && t.status !== "done"
              : t.status !== "done",
    );
    if (areaFilter !== "all") list = list.filter((t) => t.area === areaFilter);
    if (projectFilter) list = list.filter((t) => t.projectId === projectFilter);
    list = [...list].sort((a, b) =>
      (a.due || "9999").localeCompare(b.due || "9999"),
    );
    return (
      <>
        <div className="pageTitle">
          <div>
            <span className="eyebrow">TODO EN SU SITIO</span>
            <h1>Mis tareas</h1>
            <p>Organiza lo pendiente a tu ritmo.</p>
          </div>
          <button className="primaryBtn" onClick={() => openModal("task")}>
            <Plus size={18} /> Nueva tarea
          </button>
        </div>
        <div className="toolbar">
          <div className="tabs">
            {[
              ["open", "Pendientes"],
              ["undated", "Sin fecha"],
              ["done", "Completadas"],
              ["all", "Todas"],
              ["trash", "Papelera"],
            ].map(([v, l]) => (
              <button
                className={taskFilter === v ? "active" : ""}
                onClick={() => setTaskFilter(v)}
                key={v}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="toolbarRight">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} aria-label="Filtrar por proyecto">
              <option value="">Todos los proyectos</option>
              {data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              aria-label="Filtrar por área"
            >
              <option value="all">Todas las áreas</option>
              <option value="study">Estudios</option>
              <option value="personal">Personal</option>
            </select>
            <div className="segmented">
              <button
                className={taskView === "list" ? "active" : ""}
                onClick={() => setTaskView("list")}
              >
                Lista
              </button>
              <button
                className={taskView === "kanban" ? "active" : ""}
                onClick={() => setTaskView("kanban")}
              >
                Tablero
              </button>
            </div>
          </div>
        </div>
        {list.length ? (
          taskView === "list" ? (
            <div className="panel taskList">{list.map(taskRow)}</div>
          ) : (
            <div className="kanban">
              {(["pending", "progress", "waiting", "done"] as const).map(
                (status) => (
                  <div
                    className="kanbanCol"
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      const t = data.tasks.find((x) => x.id === id);
                      if (t)
                        updateTask({
                          ...t,
                          status,
                          completedAt:
                            status === "done"
                              ? new Date().toISOString()
                              : undefined,
                        });
                    }}
                  >
                    <h3>
                      {statusLabel[status]}{" "}
                      <span>
                        {list.filter((t) => t.status === status).length}
                      </span>
                    </h3>
                    {list
                      .filter((t) => t.status === status)
                      .map((t) => (
                        <div
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("text/plain", t.id)
                          }
                          className="kanbanTask"
                          key={t.id}
                          onClick={() => openModal("task", t)}
                        >
                          <strong>{t.title}</strong>
                          <small>
                            {t.due ? dateLabel(t.due) : "Sin fecha"} ·{" "}
                            {priorityLabel[t.priority]}
                          </small>
                        </div>
                      ))}
                  </div>
                ),
              )}
            </div>
          )
        ) : (
          <div className="empty">
            <CheckSquare />
            <h3>Todo despejado por aquí</h3>
            <p>Las tareas que encajen con este filtro aparecerán aquí.</p>
          </div>
        )}
        {taskFilter !== "done" && openTasks.length > 0 && (
          <div className="selectionPanel">
            <h3>Elige tus prioridades de hoy</h3>
            <p>Hasta tres tareas. Puedes cambiarlas cuando quieras.</p>
            <div className="chips">
              {openTasks.slice(0, 12).map((t) => (
                <button
                  key={t.id}
                  className={data.priorities.includes(t.id) ? "selected" : ""}
                  onClick={() =>
                    change(
                      (s) => ({
                        ...s,
                        priorities: s.priorities.includes(t.id)
                          ? s.priorities.filter((x) => x !== t.id)
                          : s.priorities.length < 3
                            ? [...s.priorities, t.id]
                            : s.priorities,
                      }),
                      data.priorities.includes(t.id)
                        ? "Prioridad retirada"
                        : data.priorities.length < 3
                          ? "Prioridad añadida"
                          : "Máximo tres prioridades",
                    )
                  }
                >
                  {data.priorities.includes(t.id) ? "✓ " : ""}
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };
  const inboxPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">DESCARGA MENTAL</span>
          <h1>Bandeja de entrada</h1>
          <p>Apunta ahora. Organiza después.</p>
        </div>
      </div>
      <div className="capture">
        <textarea
          id="capture"
          placeholder="¿Qué tienes en mente? Escríbelo tal como te salga…"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              const v = e.currentTarget.value.trim();
              if (v) {
                change(
                  (s) => ({
                    ...s,
                    notes: [
                      {
                        id: uid(),
                        text: v,
                        createdAt: new Date().toISOString(),
                      },
                      ...s.notes,
                    ],
                  }),
                  "Guardado en la bandeja",
                );
                e.currentTarget.value = "";
              }
            }
          }}
        />
        <div>
          <small>⌘/Ctrl + Enter para guardar</small>
          <button
            className="primaryBtn"
            onClick={() => {
              const el = document.getElementById(
                "capture",
              ) as HTMLTextAreaElement;
              const v = el.value.trim();
              if (v) {
                change(
                  (s) => ({
                    ...s,
                    notes: [
                      {
                        id: uid(),
                        text: v,
                        createdAt: new Date().toISOString(),
                      },
                      ...s.notes,
                    ],
                  }),
                  "Guardado en la bandeja",
                );
                el.value = "";
              }
            }}
          >
            <Plus size={17} /> Guardar idea
          </button>
        </div>
      </div>
      <div className="sectionHead">
        <h2>
          Por organizar{" "}
          <span className="count">
            {data.notes.filter((n) => !n.archived).length}
          </span>
        </h2>
      </div>
      {data.notes.filter((n) => !n.archived).length ? (
        <div className="noteGrid">
          {data.notes
            .filter((n) => !n.archived)
            .map((n) => (
              <article className="noteCard" key={n.id}>
                <small>{dateLabel(n.createdAt.slice(0, 10))}</small>
                <p>{n.text}</p>
                <div className="noteActions">
                  <button
                    onClick={() => {
                      openModal("task", { ...blankTask(), title: n.text });
                    }}
                  >
                    <CheckSquare size={16} /> Tarea
                  </button>
                  <button
                    onClick={() => {
                      openModal("event", { ...blankEvent(), title: n.text });
                    }}
                  >
                    <CalendarDays size={16} /> Evento
                  </button>
                  <button
                    onClick={() =>
                      change(
                        (s) => ({
                          ...s,
                          notes: s.notes.map((x) =>
                            x.id === n.id ? { ...x, archived: true } : x,
                          ),
                        }),
                        "Nota archivada",
                      )
                    }
                    aria-label="Archivar"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("¿Eliminar esta nota?"))
                        change(
                          (s) => ({
                            ...s,
                            notes: s.notes.filter((x) => x.id !== n.id),
                          }),
                          "Nota eliminada",
                        );
                    }}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <div className="empty">
          <Inbox />
          <h3>La mente un poco más libre</h3>
          <p>
            Este espacio espera tus ideas, recordatorios o asuntos por resolver.
          </p>
        </div>
      )}
    </>
  );
  const calendarPage = () => {
    const first =
      calendarView === "month"
        ? startOfWeek(startOfMonth(calendarDate), {
            weekStartsOn: data.settings.weekStartsOn,
          })
        : startOfWeek(calendarDate, {
            weekStartsOn: data.settings.weekStartsOn,
          });
    const days =
      calendarView === "month"
        ? eachDayOfInterval({
            start: first,
            end: endOfWeek(endOfMonth(calendarDate), {
              weekStartsOn: data.settings.weekStartsOn,
            }),
          })
        : calendarView === "week"
          ? Array.from({ length: 7 }, (_, i) => addDays(first, i))
          : [calendarDate];
    const items = (d: Date) => {
      const key = format(d, "yyyy-MM-dd");
      return [
        ...data.events
          .filter((e) => e.date.slice(0, 10) === key)
          .map((e) => ({
            id: e.id,
            title: e.title,
            kind: "event",
            type: e.type,
          })),
        ...liveTasks
          .filter((t) => t.due === key && t.status !== "done")
          .map((t) => ({
            id: t.id,
            title: t.title,
            kind: "task",
            type: "delivery",
          })),
        ...data.exams
          .filter((exam) => exam.date.slice(0, 10) === key)
          .map((exam) => ({
            id: exam.id,
            title: exam.title,
            kind: "exam",
            type: "exam",
          })),
      ];
    };
    return (
      <>
        <div className="pageTitle">
          <div>
            <span className="eyebrow">TU TIEMPO</span>
            <h1>Calendario</h1>
            <p>Entregas, compromisos y espacio para trabajar.</p>
          </div>
          <button className="primaryBtn" onClick={() => openModal("event")}>
            <Plus size={18} /> Nuevo evento
          </button>
        </div>
        <div className="toolbar calendarToolbar">
          <div className="calendarNav">
            <button
              className="iconBtn"
              onClick={() =>
                setCalendarDate(
                  calendarView === "month"
                    ? subMonths(calendarDate, 1)
                    : addDays(calendarDate, calendarView === "week" ? -7 : -1),
                )
              }
            >
              <ChevronLeft />
            </button>
            <h2>
              {format(
                calendarDate,
                calendarView === "month" ? "MMMM yyyy" : "d MMMM yyyy",
                { locale: es },
              )}
            </h2>
            <button
              className="iconBtn"
              onClick={() =>
                setCalendarDate(
                  calendarView === "month"
                    ? addMonths(calendarDate, 1)
                    : addDays(calendarDate, calendarView === "week" ? 7 : 1),
                )
              }
            >
              <ChevronRight />
            </button>
            <button
              className="subtleBtn"
              onClick={() => setCalendarDate(new Date())}
            >
              Hoy
            </button>
          </div>
          <div className="segmented">
            {[
              ["month", "Mes"],
              ["week", "Semana"],
              ["day", "Día"],
              ["agenda", "Agenda"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={calendarView === v ? "active" : ""}
                onClick={() => setCalendarView(v as any)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {calendarView === "agenda" ? (
          <div className="panel">
            {upcoming.length ? (
              upcoming.map((x) => (
                <div className="upcoming" key={x.kind + x.id}>
                  <span className="dateBlock">
                    <b>{dateLabel(x.date)}</b>
                  </span>
                  <div>
                    <strong>{x.title}</strong>
                    <small>{x.kind}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">No hay próximas fechas.</div>
            )}
          </div>
        ) : (
          <div
            className={
              "calendarGrid " +
              (calendarView === "month" ? "monthGrid" : "weekGrid")
            }
          >
            {calendarView === "month" &&
              ["L", "M", "X", "J", "V", "S", "D"].map((n, i) => (
                <div className="calWeekHead" key={i}>
                  {n}
                </div>
              ))}
            {days.map((d) => (
              <div
                className={
                  "calDay " +
                  (isSameDay(d, new Date()) ? "today" : "") +
                  (d.getMonth() !== calendarDate.getMonth() &&
                  calendarView === "month"
                    ? " outside"
                    : "")
                }
                key={d.toISOString()}
              >
                <button
                  className="calDate"
                  onClick={() => {
                    setCalendarDate(d);
                    setCalendarView("day");
                  }}
                >
                  {format(d, calendarView === "month" ? "d" : "EEEE d", {
                    locale: es,
                  })}
                </button>
                {items(d).map((x) => (
                  <button
                    key={x.kind + x.id}
                    className={"calItem " + x.type}
                    onClick={() =>
                      openModal(
                        x.kind === "task"
                          ? "task"
                          : x.kind === "exam"
                            ? "exam"
                            : "event",
                        x.kind === "task"
                          ? data.tasks.find((t) => t.id === x.id)
                          : x.kind === "exam"
                            ? data.exams.find((exam) => exam.id === x.id)
                            : data.events.find((e) => e.id === x.id),
                      )
                    }
                  >
                    {x.title}
                  </button>
                ))}
                <button
                  className="calAdd"
                  onClick={() =>
                    openModal("event", {
                      ...blankEvent(),
                      date: format(d, "yyyy-MM-dd"),
                    })
                  }
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="hint">
          Las entregas aparecen como fecha límite. Los eventos y bloques de
          trabajo son compromisos del calendario.
        </p>
      </>
    );
  };
  const projectsPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">DEL PLAN A LA ACCIÓN</span>
          <h1>Proyectos</h1>
          <p>Todo lo que necesita más de un paso.</p>
        </div>
        <button className="primaryBtn" onClick={() => openModal("project")}>
          <Plus size={18} /> Nuevo proyecto
        </button>
      </div>
      {data.projects.length ? (
        <div className="projectGrid">
          {data.projects.map((p) => {
            const tasks = liveTasks.filter((t) => t.projectId === p.id);
            const done = tasks.filter((t) => t.status === "done").length;
            return (
              <article className="projectCard" key={p.id}>
                <div className="cardTop">
                  <span className="pill">
                    {p.area === "study" ? "Estudios" : "Personal"}
                  </span>
                  <button
                    className="iconBtn"
                    onClick={() => openModal("project", p)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <h3>{p.name}</h3>
                <p>{p.description || "Sin descripción"}</p>
                <div className="progressTrack">
                  <div
                    style={{
                      width: tasks.length
                        ? `${(done / tasks.length) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <small>
                  {tasks.length
                    ? `${done} de ${tasks.length} tareas completadas`
                    : "Aún no hay tareas"}
                  {p.due ? ` · ${dateLabel(p.due)}` : ""}
                </small>
                <button
                  className="cardAction"
                  onClick={() => {
                    setAreaFilter(p.area);
                    setProjectFilter(p.id);
                    setTaskFilter("all");
                    go("tasks");
                  }}
                >
                  Ver tareas <ArrowRight size={16} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <FolderKanban />
          <h3>Los proyectos empiezan aquí</h3>
          <p>Reúne tareas relacionadas y sigue su avance real.</p>
        </div>
      )}
    </>
  );
  const createProjectFromTemplate = (
    template: StudyTemplate,
    projectName: string,
    subjectId?: string,
  ) => {
    const projectId = uid();
    change(
      (s) => ({
        ...s,
        projects: [
          ...s.projects,
          {
            id: projectId,
            name: projectName.trim() || template.name,
            description: template.description,
            area: "study",
            status: "active",
            subjectId,
          },
        ],
        tasks: [
          ...s.tasks,
          ...template.steps.map((title, index) => ({
            ...blankTask(),
            id: uid(),
            title,
            projectId,
            subjectId,
            minutes: index === template.steps.length - 1 ? 15 : 45,
          })),
        ],
      }),
      "Proyecto y tareas creados",
    );
  };
  const studiesPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">ESPACIO ACADÉMICO</span>
          <h1>Estudios</h1>
          <p>Asignaturas, entregas y trabajo en curso.</p>
        </div>
        <div className="pageActions">
          <button className="subtleBtn" onClick={() => openModal("exam")}>
            <Plus size={18} /> Examen
          </button>
          <button className="primaryBtn" onClick={() => openModal("subject")}>
            <Plus size={18} /> Asignatura
          </button>
        </div>
      </div>
      {data.subjects.length ? (
        <div className="subjectGrid">
          {data.subjects
            .filter((s) => !s.archived)
            .map((s) => (
              <article className="subjectCard" key={s.id}>
                <div
                  className="subjectAccent"
                  style={{ background: s.color }}
                />
                <button
                  className="iconBtn floatRight"
                  onClick={() => openModal("subject", s)}
                >
                  <MoreHorizontal size={18} />
                </button>
                <h3>{s.name}</h3>
                <p>{s.teacher || "Asignatura"}</p>
                <div className="subjectFoot">
                  {openTasks.filter((t) => t.subjectId === s.id).length} tareas
                  pendientes <ArrowRight size={16} />
                </div>
              </article>
            ))}
        </div>
      ) : (
        <div className="empty">
          <GraduationCap />
          <h3>Un lugar para cada asignatura</h3>
          <p>Añade tus asignaturas y vincula tareas y entregas.</p>
        </div>
      )}
      <div className="sectionHead">
        <h2>Próximas entregas</h2>
      </div>
      <div className="panel taskList">
        {openTasks
          .filter((t) => t.area === "study" && t.due)
          .slice(0, 5)
          .map(taskRow)}
      </div>
      <div className="sectionHead academicSection">
        <div>
          <span className="eyebrow">PREPARACIÓN REAL</span>
          <h2>Exámenes</h2>
        </div>
        <button className="subtleBtn" onClick={() => openModal("exam")}>
          <Plus size={16} /> Añadir examen
        </button>
      </div>
      {data.exams.length ? (
        <div className="examGrid">
          {[...data.exams]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((exam) => {
              const completed = exam.topics.filter(
                (topic) => topic.done,
              ).length;
              return (
                <article className="examCard" key={exam.id}>
                  <div className="cardTop">
                    <span className="pill">
                      {subjectName(exam.subjectId) || "Sin asignatura"}
                    </span>
                    <button
                      className="iconBtn"
                      onClick={() => openModal("exam", exam)}
                      aria-label={`Editar ${exam.title}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  <h3>{exam.title}</h3>
                  <p>{dateLabel(exam.date.slice(0, 10))}</p>
                  <div className="progressTrack">
                    <div
                      style={{
                        width: exam.topics.length
                          ? `${(completed / exam.topics.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <small>
                    {exam.topics.length
                      ? `${completed} de ${exam.topics.length} temas preparados`
                      : "Añade los temas que entran"}
                    {` · Preparación ${exam.preparation}/5`}
                  </small>
                </article>
              );
            })}
        </div>
      ) : (
        <div className="empty compactEmpty">
          <CalendarClock />
          <h3>Sin exámenes añadidos</h3>
          <p>
            Cuando tengas una fecha, podrás dividir el temario y ver el avance.
          </p>
        </div>
      )}
      <div className="sectionHead academicSection">
        <div>
          <span className="eyebrow">PUNTOS DE PARTIDA</span>
          <h2>Plantillas de proyectos</h2>
        </div>
        <button className="subtleBtn" onClick={() => openModal("template")}>
          <Plus size={16} /> Nueva plantilla
        </button>
      </div>
      <div className="templateGrid">
        {data.templates.map((template) => (
          <article className="templateCard" key={template.id}>
            <span className="pill">
              {template.kind === "photo"
                ? "Fotografía"
                : template.kind === "audiovisual"
                  ? "Audiovisual"
                  : template.kind === "exam"
                    ? "Estudio"
                    : "Personalizada"}
            </span>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <small>{template.steps.length} pasos editables</small>
            <div className="templateActions">
              <button
                className="subtleBtn"
                onClick={() => openModal("template", template)}
              >
                Ver y editar
              </button>
              <button
                className="primaryBtn"
                onClick={() => {
                  createProjectFromTemplate(template, template.name);
                  go("projects");
                }}
              >
                Usar plantilla
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
  const personalPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">MÁS ALLÁ DE CLASE</span>
          <h1>Mi vida personal</h1>
          <p>También hay espacio para lo de fuera.</p>
        </div>
        <button
          className="primaryBtn"
          onClick={() =>
            openModal("task", { ...blankTask(), area: "personal" })
          }
        >
          <Plus size={18} /> Nueva tarea
        </button>
      </div>
      <div className="panel taskList">
        {liveTasks.filter((t) => t.area === "personal").length ? (
          liveTasks.filter((t) => t.area === "personal").map(taskRow)
        ) : (
          <div className="empty">
            <Heart />
            <h3>Tu espacio personal</h3>
            <p>Las gestiones, citas y proyectos personales aparecerán aquí.</p>
          </div>
        )}
      </div>
    </>
  );
  const progressPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">SIN PRISAS</span>
          <h1>Mi progreso</h1>
          <p>Una mirada honesta a lo que has hecho.</p>
        </div>
      </div>
      <div className="stats large">
        {[
          [
            "Tareas completadas",
            liveTasks.filter((t) => t.status === "done").length,
          ],
          [
            "En progreso",
            openTasks.filter((t) => t.status === "progress").length,
          ],
          [
            "Tiempo de concentración",
            data.sessions.reduce((n, s) => n + s.minutes, 0) + " min",
          ],
          [
            "Proyectos terminados",
            data.projects.filter((p) => p.status === "done").length,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="sectionHead">
        <h2>Historial reciente</h2>
      </div>
      <div className="panel taskList">
        {liveTasks.filter((t) => t.status === "done").length ? (
          liveTasks
            .filter((t) => t.status === "done")
            .sort((a, b) =>
              (b.completedAt || "").localeCompare(a.completedAt || ""),
            )
            .slice(0, 10)
            .map(taskRow)
        ) : (
          <div className="empty">Todavía no hay tareas completadas.</div>
        )}
      </div>
    </>
  );
  const overwhelmedPage = () => {
    const list = suggestions(openTasks);
    const picks = [
      list[overIndex % Math.max(1, list.length)],
      openTasks.filter((t) => t.minutes <= 20)[
        overIndex % Math.max(1, openTasks.filter((t) => t.minutes <= 20).length)
      ],
      openTasks.filter((t) => t.status === "progress")[
        overIndex %
          Math.max(1, openTasks.filter((t) => t.status === "progress").length)
      ],
    ].filter(Boolean);
    return (
      <div className="calm">
        <button className="textLink" onClick={() => go("space")}>
          <ChevronLeft size={16} /> Volver a mi espacio
        </button>
        <span className="eyebrow">UN PASO CADA VEZ</span>
        <h1>Empecemos por algo pequeño.</h1>
        <p>
          No hace falta resolverlo todo ahora. Elige una opción que te resulte
          posible.
        </p>
        {picks.length ? (
          picks.map((t, i) => (
            <div className="calmCard" key={t.id + i}>
              <span className="eyebrow">
                {["Importante y cercana", "Rápida", "Para continuar"][i]}
              </span>
              <h2>{t.title}</h2>
              <p>
                {t.minutes} min {t.due ? "· " + dateLabel(t.due) : ""}
              </p>
              <button
                className="primaryBtn"
                onClick={() => {
                  setFocusTask(t.id);
                  setFocusLength(10);
                  setSeconds(600);
                  go("focus");
                }}
              >
                Empezar 10 minutos <ArrowRight size={16} />
              </button>
              <button
                className="subtleBtn"
                onClick={() => openModal("task", t)}
              >
                Dividir en pasos
              </button>
            </div>
          ))
        ) : (
          <div className="empty">
            Todavía no hay tareas para sugerir. Puedes elegir una manualmente en
            Mis tareas.
          </div>
        )}
        <button
          className="subtleBtn"
          onClick={() => setOverIndex(overIndex + 1)}
        >
          Ver otra sugerencia
        </button>
      </div>
    );
  };
  const focusPage = () => (
    <div className="focusPage">
      <span className="eyebrow">TIEMPO PARA TI</span>
      <h1>Concentración</h1>
      <p>Solo una cosa a la vez.</p>
      <select value={focusTask} onChange={(e) => setFocusTask(e.target.value)}>
        <option value="">Sin tarea asociada</option>
        {openTasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      <div className="timerDisplay">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </div>
      <div className="timerLengths">
        {[25, 45, 60].map((n) => (
          <button
            key={n}
            className={focusLength === n ? "selected" : ""}
            onClick={() => {
              setRunning(false);
              setFocusLength(n);
              setSeconds(n * 60);
            }}
          >
            {n} min
          </button>
        ))}
      </div>
      <div className="focusActions">
        <button className="primaryBtn" onClick={() => setRunning(!running)}>
          {running ? <Pause size={18} /> : <Play size={18} />}{" "}
          {running ? "Pausar" : "Empezar"}
        </button>
        <button
          className="subtleBtn"
          onClick={() => {
            setRunning(false);
            setSeconds(focusLength * 60);
          }}
        >
          <RotateCcw size={16} /> Reiniciar
        </button>
        {running && (
          <button
            className="subtleBtn"
            onClick={() => {
              setRunning(false);
              change(
                (s) => ({
                  ...s,
                  sessions: [
                    ...s.sessions,
                    {
                      id: uid(),
                      taskId: focusTask || undefined,
                      minutes: Math.max(
                        1,
                        Math.ceil((focusLength * 60 - seconds) / 60),
                      ),
                      at: new Date().toISOString(),
                    },
                  ],
                }),
                "Sesión registrada",
              );
            }}
          >
            Finalizar
          </button>
        )}
      </div>
      {seconds === 0 && focusTask && (
        <button
          className="subtleBtn"
          onClick={() => {
            const t = data.tasks.find((t) => t.id === focusTask);
            if (t)
              updateTask({
                ...t,
                status: "done",
                completedAt: new Date().toISOString(),
              });
          }}
        >
          Marcar tarea como completada
        </button>
      )}
    </div>
  );
  const settingsPage = () => (
    <>
      <div className="pageTitle">
        <div>
          <span className="eyebrow">A TU MANERA</span>
          <h1>Ajustes</h1>
          <p>Haz que CLARO se adapte a ti.</p>
        </div>
      </div>
      <div className="settingsGrid">
        <section className="panel settingsPanel">
          <h2>Mi espacio</h2>
          <label>
            Nombre del espacio
            <input
              value={data.settings.name}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, name: e.target.value },
                }))
              }
            />
          </label>
          <label>
            Vista inicial
            <select
              value={data.settings.home}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, home: e.target.value },
                }))
              }
            >
              {nav.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Densidad
            <select
              value={data.settings.density}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, density: e.target.value as any },
                }))
              }
            >
              <option value="comfortable">Cómoda</option>
              <option value="compact">Compacta</option>
            </select>
          </label>
          <label>
            Primer día de la semana
            <select
              value={data.settings.weekStartsOn}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    weekStartsOn: Number(e.target.value) as 0 | 1,
                  },
                }))
              }
            >
              <option value="1">Lunes</option>
              <option value="0">Domingo</option>
            </select>
          </label>
        </section>
        <section className="panel settingsPanel">
          <h2>Apariencia</h2>
          <div className="themeChoices">
            <button
              className={data.settings.theme === "light" ? "selected" : ""}
              onClick={() =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, theme: "light" },
                }))
              }
            >
              <Sun /> Claro
            </button>
            <button
              className={data.settings.theme === "dark" ? "selected" : ""}
              onClick={() =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, theme: "dark" },
                }))
              }
            >
              <Moon /> Oscuro
            </button>
          </div>
          <label>
            Color de acento
            <input
              type="color"
              value={data.settings.accent}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, accent: e.target.value },
                }))
              }
            />
          </label>
          <label className="checkLabel">
            <input
              type="checkbox"
              checked={data.settings.showSummary}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, showSummary: e.target.checked },
                }))
              }
            />{" "}
            Mostrar resumen en Mi espacio
          </label>
        </section>
        <section className="panel settingsPanel">
          <h2>Tus datos</h2>
          <p>
            Los datos se guardan en este navegador. Exporta una copia para
            conservarlos fuera de él.
          </p>
          <div className="settingsActions">
            <button
              className="subtleBtn"
              onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `claro-copia-${today()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={17} /> Exportar JSON
            </button>
            <button
              className="subtleBtn"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={17} /> Importar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const value = JSON.parse(await file.text());
                  if (!validateImport(value)) throw Error("Formato no válido");
                  if (
                    confirm(
                      "¿Reemplazar todos tus datos por esta copia? Exporta antes una copia de los datos actuales.",
                    )
                  ) {
                    setData(normalizeState(value));
                    setToast("Datos importados");
                  }
                } catch {
                  setError("El archivo no tiene un formato válido de CLARO.");
                }
                e.target.value = "";
              }}
            />
          </div>
          <button
            className="dangerBtn"
            onClick={() => {
              if (
                confirm(
                  "¿Eliminar todos los datos de CLARO en este navegador? Esta acción no se puede deshacer.",
                )
              )
                setData({
                  ...initial,
                  settings: { ...initial.settings, onboarded: true },
                });
            }}
          >
            Eliminar todos mis datos
          </button>
        </section>
      </div>
    </>
  );
  const weeklyPage = () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i),
    );
    return (
      <>
        <div className="pageTitle">
          <div>
            <span className="eyebrow">UN POCO DE PERSPECTIVA</span>
            <h1>Planificación semanal</h1>
            <p>Distribuye el trabajo sin mover tus fechas de entrega.</p>
          </div>
        </div>
        <div className="weeklySummary">
          <div>
            <strong>{openTasks.filter((task) => !task.start).length}</strong>
            <span>Tareas aún sin planificar</span>
          </div>
          <div>
            <strong>
              {openTasks.reduce((total, task) => total + task.minutes, 0)} min
            </strong>
            <span>Trabajo pendiente estimado</span>
          </div>
          <div>
            <strong>{data.events.length}</strong>
            <span>Compromisos en el calendario</span>
          </div>
        </div>
        <div className="weeklyGrid">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const planned = openTasks.filter((t) => t.start === key);
            const minutes = planned.reduce((n, t) => n + t.minutes, 0);
            const commitments = data.events.filter(
              (event) => event.date.slice(0, 10) === key,
            );
            return (
              <div
                className={`weeklyDay ${minutes > 240 ? "overloaded" : ""}`}
                key={key}
              >
                <h3>{format(d, "EEEE d", { locale: es })}</h3>
                <small>
                  {minutes} min previstos
                  {minutes > 240 ? " · Día bastante cargado" : ""}
                </small>
                {commitments.map((event) => (
                  <button
                    className="weeklyCommitment"
                    key={event.id}
                    onClick={() => openModal("event", event)}
                  >
                    <CalendarClock size={13} /> {event.title}
                  </button>
                ))}
                {planned.map((t) => (
                  <div className="weeklyTask" key={t.id}>
                    <button onClick={() => openModal("task", t)}>
                      {t.title}
                      {t.due && <small>Entrega {dateLabel(t.due)}</small>}
                    </button>
                    <button
                      className="iconBtn"
                      aria-label={`Quitar ${t.title} del día`}
                      onClick={() => updateTask({ ...t, start: undefined })}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <select
                  value=""
                  onChange={(e) => {
                    const t = data.tasks.find((t) => t.id === e.target.value);
                    if (t) updateTask({ ...t, start: key });
                  }}
                >
                  <option value="">+ Planificar tarea</option>
                  {openTasks
                    .filter((t) => t.start !== key)
                    .map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </>
    );
  };
  function TaskForm() {
    const [v, setV] = useState<Task>(editing || blankTask());
    const [step, setStep] = useState("");
    const set = (key: keyof Task, value: any) =>
      setV((x) => ({ ...x, [key]: value }));
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.title.trim()) return;
          updateTask({ ...v, title: v.title.trim() });
          setModal(null);
        }}
      >
        <label>
          Título *
          <input
            autoFocus
            required
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="¿Qué necesitas hacer?"
          />
        </label>
        <label>
          Descripción
          <textarea
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Detalles que te ayudarán después"
          />
        </label>
        <div className="formGrid">
          <label>
            Área
            <select
              value={v.area}
              onChange={(e) => set("area", e.target.value)}
            >
              <option value="study">Estudios</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={v.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {Object.entries(statusLabel).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={v.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {Object.entries(priorityLabel).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duración estimada (min)
            <input
              type="number"
              min="0"
              value={v.minutes}
              onChange={(e) => set("minutes", Number(e.target.value))}
            />
          </label>
          <label>
            Quiero empezar
            <input
              type="date"
              value={v.start || ""}
              onChange={(e) => set("start", e.target.value || undefined)}
            />
          </label>
          <label>
            Fecha límite
            <input
              type="date"
              value={v.due || ""}
              onChange={(e) => set("due", e.target.value || undefined)}
            />
          </label>
          <label>
            Asignatura
            <select
              value={v.subjectId || ""}
              onChange={(e) => set("subjectId", e.target.value || undefined)}
            >
              <option value="">Ninguna</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proyecto
            <select
              value={v.projectId || ""}
              onChange={(e) => set("projectId", e.target.value || undefined)}
            >
              <option value="">Ninguno</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="subtasks">
          <strong>Pasos</strong>
          {v.subtasks.map((st) => (
            <label className="step" key={st.id}>
              <input
                type="checkbox"
                checked={st.done}
                onChange={(e) =>
                  set(
                    "subtasks",
                    v.subtasks.map((x) =>
                      x.id === st.id ? { ...x, done: e.target.checked } : x,
                    ),
                  )
                }
              />
              <input
                value={st.title}
                onChange={(e) =>
                  set(
                    "subtasks",
                    v.subtasks.map((x) =>
                      x.id === st.id ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="iconBtn"
                onClick={() =>
                  set(
                    "subtasks",
                    v.subtasks.filter((x) => x.id !== st.id),
                  )
                }
              >
                <X size={15} />
              </button>
            </label>
          ))}
          <div className="stepAdd">
            <input
              value={step}
              onChange={(e) => setStep(e.target.value)}
              placeholder="Añadir paso"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (step.trim()) {
                    set("subtasks", [
                      ...v.subtasks,
                      { id: uid(), title: step.trim(), done: false },
                    ]);
                    setStep("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="subtleBtn"
              onClick={() => {
                if (step.trim()) {
                  set("subtasks", [
                    ...v.subtasks,
                    { id: uid(), title: step.trim(), done: false },
                  ]);
                  setStep("");
                }
              }}
            >
              Añadir
            </button>
          </div>
        </div>
        <div className="modalFoot">
          {editing && (
            <>
              {v.deletedAt && (
                <button
                  type="button"
                  className="subtleBtn"
                  onClick={() => {
                    updateTask({ ...v, deletedAt: undefined });
                    setModal(null);
                  }}
                >
                  Restaurar
                </button>
              )}
              <button
                type="button"
                className="dangerBtn"
                onClick={() => {
                  if (
                    confirm(
                      v.deletedAt
                        ? "¿Eliminar esta tarea definitivamente?"
                        : "¿Mover esta tarea a la papelera?",
                    )
                  ) {
                    change(
                      (s) => ({
                        ...s,
                        tasks: v.deletedAt
                          ? s.tasks.filter((t) => t.id !== v.id)
                          : s.tasks.map((t) =>
                              t.id === v.id
                                ? { ...t, deletedAt: new Date().toISOString() }
                                : t,
                            ),
                      }),
                      v.deletedAt
                        ? "Tarea eliminada"
                        : "Tarea movida a la papelera",
                    );
                    setModal(null);
                  }
                }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
              <button
                type="button"
                className="subtleBtn"
                onClick={() => {
                  updateTask({
                    ...v,
                    id: uid(),
                    title: v.title + " (copia)",
                    status: "pending",
                    completedAt: undefined,
                  });
                  setModal(null);
                }}
              >
                <Copy size={16} /> Duplicar
              </button>
            </>
          )}
          <button className="primaryBtn" type="submit">
            Guardar tarea
          </button>
        </div>
      </form>
    );
  }
  function EventForm() {
    const [v, setV] = useState<Event>(editing || blankEvent());
    const set = (key: keyof Event, value: any) =>
      setV((x) => ({ ...x, [key]: value }));
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.title.trim() || !v.date) return;
          change(
            (s) => ({
              ...s,
              events: s.events.some((x) => x.id === v.id)
                ? s.events.map((x) => (x.id === v.id ? v : x))
                : [...s.events, v],
            }),
            "Evento guardado",
          );
          setModal(null);
        }}
      >
        <label>
          Título *
          <input
            required
            autoFocus
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <div className="formGrid">
          <label>
            Fecha y hora
            <input
              type={v.allDay ? "date" : "datetime-local"}
              required
              value={v.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          <label>
            Tipo
            <select
              value={v.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {[
                ["class", "Clase"],
                ["exam", "Examen"],
                ["delivery", "Entrega"],
                ["work", "Bloque de trabajo"],
                ["personal", "Personal"],
              ].map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkLabel">
          <input
            type="checkbox"
            checked={v.allDay}
            onChange={(e) => set("allDay", e.target.checked)}
          />{" "}
          Todo el día
        </label>
        <label>
          Notas
          <textarea
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        <div className="modalFoot">
          {editing && (
            <button
              type="button"
              className="dangerBtn"
              onClick={() => {
                if (confirm("¿Eliminar este evento?")) {
                  change(
                    (s) => ({
                      ...s,
                      events: s.events.filter((x) => x.id !== v.id),
                    }),
                    "Evento eliminado",
                  );
                  setModal(null);
                }
              }}
            >
              Eliminar
            </button>
          )}
          <button className="primaryBtn">Guardar evento</button>
        </div>
      </form>
    );
  }
  function ProjectForm() {
    const [v, setV] = useState<Project>(
      editing || {
        id: uid(),
        name: "",
        description: "",
        area: "study",
        status: "active",
      },
    );
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.name.trim()) return;
          change(
            (s) => ({
              ...s,
              projects: s.projects.some((x) => x.id === v.id)
                ? s.projects.map((x) => (x.id === v.id ? v : x))
                : [...s.projects, v],
            }),
            "Proyecto guardado",
          );
          setModal(null);
        }}
      >
        <label>
          Nombre *
          <input
            required
            autoFocus
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label>
          Descripción
          <textarea
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </label>
        <div className="formGrid">
          <label>
            Área
            <select
              value={v.area}
              onChange={(e) => setV({ ...v, area: e.target.value as any })}
            >
              <option value="study">Estudios</option>
              <option value="personal">Personal</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value as any })}
            >
              <option value="active">Activo</option>
              <option value="waiting">En espera</option>
              <option value="done">Completado</option>
              <option value="archived">Archivado</option>
            </select>
          </label>
          <label>
            Fecha límite
            <input
              type="date"
              value={v.due || ""}
              onChange={(e) => setV({ ...v, due: e.target.value })}
            />
          </label>
          <label>
            Asignatura
            <select
              value={v.subjectId || ""}
              onChange={(e) => setV({ ...v, subjectId: e.target.value })}
            >
              <option value="">Ninguna</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modalFoot">
          {editing && (
            <button
              type="button"
              className="dangerBtn"
              onClick={() => {
                if (confirm("¿Eliminar proyecto? Sus tareas se conservarán.")) {
                  change((s) => ({
                    ...s,
                    projects: s.projects.filter((x) => x.id !== v.id),
                  }));
                  setModal(null);
                }
              }}
            >
              Eliminar
            </button>
          )}
          <button className="primaryBtn">Guardar proyecto</button>
        </div>
      </form>
    );
  }
  function SubjectForm() {
    const [v, setV] = useState<Subject>(
      editing || {
        id: uid(),
        name: "",
        color: "#a8bfaf",
        teacher: "",
        notes: "",
      },
    );
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.name.trim()) return;
          change(
            (s) => ({
              ...s,
              subjects: s.subjects.some((x) => x.id === v.id)
                ? s.subjects.map((x) => (x.id === v.id ? v : x))
                : [...s.subjects, v],
            }),
            "Asignatura guardada",
          );
          setModal(null);
        }}
      >
        <label>
          Nombre *
          <input
            required
            autoFocus
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <div className="formGrid">
          <label>
            Profesor
            <input
              value={v.teacher}
              onChange={(e) => setV({ ...v, teacher: e.target.value })}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={v.color}
              onChange={(e) => setV({ ...v, color: e.target.value })}
            />
          </label>
        </div>
        <label>
          Notas
          <textarea
            value={v.notes}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
          />
        </label>
        <div className="modalFoot">
          {editing && (
            <>
              <button
                type="button"
                className="subtleBtn"
                onClick={() => {
                  change((s) => ({
                    ...s,
                    subjects: s.subjects.map((x) =>
                      x.id === v.id ? { ...x, archived: !x.archived } : x,
                    ),
                  }));
                  setModal(null);
                }}
              >
                {v.archived ? "Restaurar" : "Archivar"}
              </button>
              <button
                type="button"
                className="dangerBtn"
                onClick={() => {
                  if (
                    confirm("¿Eliminar asignatura? Sus tareas se conservarán.")
                  ) {
                    change((s) => ({
                      ...s,
                      subjects: s.subjects.filter((x) => x.id !== v.id),
                    }));
                    setModal(null);
                  }
                }}
              >
                Eliminar
              </button>
            </>
          )}
          <button className="primaryBtn">Guardar asignatura</button>
        </div>
      </form>
    );
  }
  function ExamForm() {
    const [v, setV] = useState<Exam>(editing || blankExam());
    const [topic, setTopic] = useState("");
    const saveExam = () =>
      change(
        (s) => ({
          ...s,
          exams: s.exams.some((exam) => exam.id === v.id)
            ? s.exams.map((exam) => (exam.id === v.id ? v : exam))
            : [...s.exams, v],
        }),
        "Examen guardado",
      );
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.title.trim() || !v.date) return;
          saveExam();
          setModal(null);
        }}
      >
        <label>
          Nombre del examen *
          <input
            autoFocus
            required
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            placeholder="Ej. Iluminación en estudio"
          />
        </label>
        <div className="formGrid">
          <label>
            Asignatura
            <select
              value={v.subjectId || ""}
              onChange={(e) =>
                setV({ ...v, subjectId: e.target.value || undefined })
              }
            >
              <option value="">Sin asignatura</option>
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha y hora *
            <input
              required
              type="datetime-local"
              value={v.date}
              onChange={(e) => setV({ ...v, date: e.target.value })}
            />
          </label>
          <label>
            Nivel de preparación
            <select
              value={v.preparation}
              onChange={(e) =>
                setV({
                  ...v,
                  preparation: Number(e.target.value) as Exam["preparation"],
                })
              }
            >
              <option value="1">1 · Acabo de empezar</option>
              <option value="2">2 · Primer repaso</option>
              <option value="3">3 · En marcha</option>
              <option value="4">4 · Casi preparado</option>
              <option value="5">5 · Preparado</option>
            </select>
          </label>
          <label>
            Recordatorio
            <select
              value={v.reminderDays ?? ""}
              onChange={(e) =>
                setV({
                  ...v,
                  reminderDays: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Sin recordatorio</option>
              <option value="1">Un día antes</option>
              <option value="3">Tres días antes</option>
              <option value="7">Una semana antes</option>
            </select>
          </label>
        </div>
        <div className="subtasks">
          <strong>Temas que entran</strong>
          {v.topics.map((item) => (
            <label className="step" key={item.id}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  setV({
                    ...v,
                    topics: v.topics.map((current) =>
                      current.id === item.id
                        ? { ...current, done: e.target.checked }
                        : current,
                    ),
                  })
                }
              />
              <input
                value={item.title}
                onChange={(e) =>
                  setV({
                    ...v,
                    topics: v.topics.map((current) =>
                      current.id === item.id
                        ? { ...current, title: e.target.value }
                        : current,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="iconBtn"
                onClick={() =>
                  setV({
                    ...v,
                    topics: v.topics.filter(
                      (current) => current.id !== item.id,
                    ),
                  })
                }
              >
                <X size={15} />
              </button>
            </label>
          ))}
          <div className="stepAdd">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Añadir tema o unidad"
            />
            <button
              type="button"
              className="subtleBtn"
              onClick={() => {
                if (!topic.trim()) return;
                setV({
                  ...v,
                  topics: [
                    ...v.topics,
                    { id: uid(), title: topic.trim(), done: false },
                  ],
                });
                setTopic("");
              }}
            >
              Añadir
            </button>
          </div>
        </div>
        <label>
          Notas
          <textarea
            value={v.notes}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
          />
        </label>
        <div className="modalFoot">
          {editing && (
            <button
              type="button"
              className="dangerBtn"
              onClick={() => {
                if (confirm("¿Eliminar este examen?")) {
                  change(
                    (s) => ({
                      ...s,
                      exams: s.exams.filter((exam) => exam.id !== v.id),
                    }),
                    "Examen eliminado",
                  );
                  setModal(null);
                }
              }}
            >
              Eliminar
            </button>
          )}
          <button className="primaryBtn">Guardar examen</button>
        </div>
      </form>
    );
  }
  function TemplateForm() {
    const [v, setV] = useState<StudyTemplate>(editing || blankTemplate());
    const [step, setStep] = useState("");
    const [projectName, setProjectName] = useState(v.name);
    const [subjectId, setSubjectId] = useState("");
    const saveTemplate = () =>
      change(
        (s) => ({
          ...s,
          templates: s.templates.some((template) => template.id === v.id)
            ? s.templates.map((template) =>
                template.id === v.id ? { ...v, builtIn: false } : template,
              )
            : [...s.templates, v],
        }),
        "Plantilla guardada",
      );
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.name.trim()) return;
          saveTemplate();
          setModal(null);
        }}
      >
        <label>
          Nombre *
          <input
            autoFocus
            required
            value={v.name}
            onChange={(e) => {
              setV({ ...v, name: e.target.value });
              if (!editing) setProjectName(e.target.value);
            }}
          />
        </label>
        <label>
          Descripción
          <textarea
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </label>
        <div className="subtasks">
          <strong>Pasos de la plantilla</strong>
          {v.steps.map((title, index) => (
            <label className="step" key={index}>
              <span className="stepNumber">{index + 1}</span>
              <input
                value={title}
                onChange={(e) =>
                  setV({
                    ...v,
                    steps: v.steps.map((current, currentIndex) =>
                      currentIndex === index ? e.target.value : current,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="iconBtn"
                onClick={() =>
                  setV({
                    ...v,
                    steps: v.steps.filter(
                      (_, currentIndex) => currentIndex !== index,
                    ),
                  })
                }
              >
                <X size={15} />
              </button>
            </label>
          ))}
          <div className="stepAdd">
            <input
              value={step}
              onChange={(e) => setStep(e.target.value)}
              placeholder="Nuevo paso"
            />
            <button
              type="button"
              className="subtleBtn"
              onClick={() => {
                if (!step.trim()) return;
                setV({ ...v, steps: [...v.steps, step.trim()] });
                setStep("");
              }}
            >
              Añadir
            </button>
          </div>
        </div>
        {editing && (
          <div className="templateUseBox">
            <strong>Crear un proyecto con esta plantilla</strong>
            <div className="formGrid">
              <label>
                Nombre del proyecto
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </label>
              <label>
                Asignatura
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">Sin asignatura</option>
                  {data.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="subtleBtn"
              onClick={() => {
                createProjectFromTemplate(
                  v,
                  projectName,
                  subjectId || undefined,
                );
                setModal(null);
                go("projects");
              }}
            >
              Crear proyecto y tareas <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="modalFoot">
          {editing && (
            <button
              type="button"
              className="dangerBtn"
              onClick={() => {
                if (confirm("¿Eliminar esta plantilla?")) {
                  change((s) => ({
                    ...s,
                    templates: s.templates.filter(
                      (template) => template.id !== v.id,
                    ),
                  }));
                  setModal(null);
                }
              }}
            >
              Eliminar
            </button>
          )}
          <button className="primaryBtn">Guardar plantilla</button>
        </div>
      </form>
    );
  }
  const content = () =>
    ({
      space: overview,
      inbox: inboxPage,
      tasks: tasksPage,
      calendar: calendarPage,
      projects: projectsPage,
      studies: studiesPage,
      personal: personalPage,
      focus: focusPage,
      progress: progressPage,
      settings: settingsPage,
      weekly: weeklyPage,
      overwhelmed: overwhelmedPage,
    })[page]();
  return (
    <div
      className={"app " + data.settings.theme + " " + data.settings.density}
      style={{ "--accent": data.settings.accent } as React.CSSProperties}
    >
      <aside
        className={
          "sidebar " +
          (collapsed ? "collapsed " : "") +
          (mobile ? "mobileOpen" : "")
        }
      >
        <div className="brand">
          <div className="logo">
            C<span>.</span>
          </div>
          {!collapsed && (
            <div>
              <strong>CLARO</strong>
              <small>{data.settings.name}</small>
            </div>
          )}
          <button
            className="iconBtn collapseBtn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Plegar barra lateral"
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>
        <div className="navLabel">{!collapsed && "TU ESPACIO"}</div>
        <nav>
          {nav.slice(0, 7).map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => go(key)}
              title={label}
            >
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="navLabel secondary">{!collapsed && "BIENESTAR"}</div>
        <nav>
          {nav.slice(7).map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => go(key)}
              title={label}
            >
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <button onClick={() => go("weekly")}>
            <CalendarClock size={19} />
            {!collapsed && "Planificar semana"}
          </button>
        </div>
      </aside>
      {mobile && (
        <div className="mobileOverlay" onClick={() => setMobile(false)} />
      )}
      <div className="mainWrap">
        {top}
        <main>
          {!ready ? (
            <div className="empty">Cargando tu espacio…</div>
          ) : (
            content()
          )}
        </main>
      </div>
      <nav className="bottomNav" aria-label="Navegación móvil">
        {(
          [
            ["space", "Inicio", LayoutDashboard],
            ["inbox", "Entrada", Inbox],
            ["tasks", "Tareas", CheckSquare],
            ["calendar", "Calendario", CalendarDays],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            onClick={() => go(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => setMobile(true)}>
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>
      <button
        className="floatingAdd"
        onClick={() => openModal("add")}
        aria-label="Añadir"
      >
        <Plus />
      </button>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            onClick={() => {
              if (lastSaved.current) {
                setData(lastSaved.current);
                setToast("Acción deshecha");
              }
            }}
          >
            Deshacer
          </button>
          <button onClick={() => setToast("")} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          <AlertCircle size={17} />
          {error}
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {searchOpen && (
        <Modal title="Buscar en CLARO" onClose={() => { setSearchOpen(false); setQuery(""); }}>
          <div className="searchModal">
            <input
              autoFocus
              placeholder="Buscar tareas, proyectos, asignaturas…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <div className="searchResults">
                {liveTasks
                  .filter((t) =>
                    t.title.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSearchOpen(false);
                        openModal("task", t);
                      }}
                    >
                      <CheckSquare size={17} />
                      {t.title}
                    </button>
                  ))}
                {data.projects
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSearchOpen(false);
                        openModal("project", p);
                      }}
                    >
                      <FolderKanban size={17} />
                      {p.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            {
              add: "Añadir algo nuevo",
              task: editing ? "Editar tarea" : "Nueva tarea",
              event: editing ? "Editar evento" : "Nuevo evento",
              project: editing ? "Editar proyecto" : "Nuevo proyecto",
              subject: editing ? "Editar asignatura" : "Nueva asignatura",
              exam: editing ? "Editar examen" : "Nuevo examen",
              template: editing ? "Editar plantilla" : "Nueva plantilla",
              note: "Nueva nota",
            }[modal]
          }
          onClose={() => setModal(null)}
        >
          {modal === "add" ? (
            <div className="addChoices">
              {[
                ["task", "Tarea", CheckSquare],
                ["event", "Evento", CalendarDays],
                ["project", "Proyecto", FolderKanban],
                ["exam", "Examen", GraduationCap],
                ["note", "Nota rápida", Inbox],
              ].map(([k, l, Icon]: any) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === "note") {
                      setModal(null);
                      go("inbox");
                      setTimeout(
                        () =>
                          (
                            document.getElementById(
                              "capture",
                            ) as HTMLTextAreaElement
                          )?.focus(),
                        30,
                      );
                    } else openModal(k);
                  }}
                >
                  <Icon size={21} />
                  <span>{l}</span>
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          ) : modal === "task" ? (
            <TaskForm key={editing?.id || "new-task"} />
          ) : modal === "event" ? (
            <EventForm key={editing?.id || "new-event"} />
          ) : modal === "project" ? (
            <ProjectForm key={editing?.id || "new-project"} />
          ) : modal === "subject" ? (
            <SubjectForm key={editing?.id || "new-subject"} />
          ) : modal === "exam" ? (
            <ExamForm key={editing?.id || "new-exam"} />
          ) : modal === "template" ? (
            <TemplateForm key={editing?.id || "new-template"} />
          ) : null}
        </Modal>
      )}
      {ready && !data.settings.onboarded && (
        <Modal
          title="Bienvenido a CLARO"
          onClose={() =>
            change((s) => ({
              ...s,
              settings: { ...s.settings, onboarded: true },
            }))
          }
        >
          <div className="onboarding">
            <div className="welcomeMark">
              C<span>.</span>
            </div>
            <h2>Un lugar para verlo todo con claridad.</h2>
            <p>
              Puedes empezar ahora y organizarlo sobre la marcha. Tus datos se
              guardarán en este navegador.
            </p>
            <label>
              ¿Cómo quieres llamar a tu espacio?
              <input
                value={data.settings.name}
                onChange={(e) =>
                  change((s) => ({
                    ...s,
                    settings: { ...s.settings, name: e.target.value },
                  }))
                }
              />
            </label>
            <button
              className="primaryBtn"
              onClick={() =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, onboarded: true },
                }))
              }
            >
              Entrar en mi espacio <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
