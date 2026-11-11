import { openDB } from "idb";
export type Status = "pending" | "progress" | "waiting" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Task = {
  id: string;
  title: string;
  description: string;
  area: "study" | "personal";
  subjectId?: string;
  projectId?: string;
  due?: string;
  start?: string;
  status: Status;
  priority: Priority;
  minutes: number;
  createdAt: string;
  completedAt?: string;
  subtasks: { id: string; title: string; done: boolean }[];
  tags: string[];
  deletedAt?: string;
};
export type Note = {
  id: string;
  text: string;
  createdAt: string;
  archived?: boolean;
};
export type Event = {
  id: string;
  title: string;
  date: string;
  end?: string;
  allDay: boolean;
  type: "class" | "exam" | "delivery" | "work" | "personal";
  subjectId?: string;
  projectId?: string;
  notes: string;
};
export type Subject = {
  id: string;
  name: string;
  color: string;
  teacher: string;
  notes: string;
  archived?: boolean;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  area: "study" | "personal";
  status: "active" | "waiting" | "done" | "archived";
  due?: string;
  subjectId?: string;
};
export type Session = {
  id: string;
  taskId?: string;
  minutes: number;
  at: string;
};
export type ExamTopic = { id: string; title: string; done: boolean };
export type Exam = {
  id: string;
  title: string;
  subjectId?: string;
  date: string;
  notes: string;
  preparation: 1 | 2 | 3 | 4 | 5;
  topics: ExamTopic[];
  reminderDays?: number;
};
export type StudyTemplate = {
  id: string;
  name: string;
  description: string;
  kind: "photo" | "audiovisual" | "exam" | "custom";
  steps: string[];
  builtIn?: boolean;
};
export type Settings = {
  name: string;
  theme: "light" | "dark";
  accent: string;
  density: "comfortable" | "compact";
  home: string;
  onboarded: boolean;
  weekStartsOn: 0 | 1;
  showSummary: boolean;
};
export type State = {
  tasks: Task[];
  notes: Note[];
  events: Event[];
  subjects: Subject[];
  projects: Project[];
  sessions: Session[];
  exams: Exam[];
  templates: StudyTemplate[];
  settings: Settings;
  priorities: string[];
};
export const defaultTemplates: StudyTemplate[] = [
  {
    id: "template-photo",
    name: "Proyecto fotográfico",
    description: "De las instrucciones a la entrega final.",
    kind: "photo",
    builtIn: true,
    steps: [
      "Revisar instrucciones",
      "Planificar fotografías",
      "Preparar equipo",
      "Realizar sesión",
      "Seleccionar imágenes",
      "Editar fotografías",
      "Preparar memoria",
      "Exportar documento",
      "Entregar práctica",
    ],
  },
  {
    id: "template-audiovisual",
    name: "Proyecto audiovisual",
    description: "Planificación, rodaje y posproducción.",
    kind: "audiovisual",
    builtIn: true,
    steps: [
      "Definir idea y concepto",
      "Preparar guion técnico",
      "Crear storyboard",
      "Hacer desglose de producción",
      "Preparar materiales",
      "Realizar rodaje",
      "Editar proyecto",
      "Exportar versión final",
      "Entregar proyecto",
    ],
  },
  {
    id: "template-exam",
    name: "Preparación de examen",
    description: "Divide el temario y reserva tiempo para repasar.",
    kind: "exam",
    builtIn: true,
    steps: [
      "Reunir temario y materiales",
      "Dividir el temario en unidades",
      "Planificar sesiones de estudio",
      "Preparar resúmenes",
      "Practicar contenidos",
      "Resolver dudas",
      "Hacer repaso final",
    ],
  },
];
export const initial: State = {
  tasks: [],
  notes: [],
  events: [],
  subjects: [],
  projects: [],
  sessions: [],
  exams: [],
  templates: defaultTemplates,
  priorities: [],
  settings: {
    name: "Mi espacio",
    theme: "light",
    accent: "#74957e",
    density: "comfortable",
    home: "space",
    onboarded: false,
    weekStartsOn: 1,
    showSummary: true,
  },
};
const getDb = () =>
  openDB("claro-data", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export function normalizeState(saved: Partial<State>): State {
  return {
    ...initial,
    ...saved,
    exams: saved.exams || [],
    templates: saved.templates ?? defaultTemplates,
    settings: { ...initial.settings, ...saved.settings },
  };
}
export async function load(): Promise<State> {
  const db = await getDb();
  const saved = await db.get("state", "main");
  return saved ? normalizeState(saved) : initial;
}
let pending: Promise<unknown> = Promise.resolve();
export function save(state: State) {
  const next = pending
    .catch(() => {})
    .then(async () => {
      const db = await getDb();
      await db.put("state", state, "main");
    });
  pending = next;
  return next;
}
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(value + "T12:00:00"))
    : "";
export const priorityLabel: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};
export const statusLabel: Record<Status, string> = {
  pending: "Pendiente",
  progress: "En progreso",
  waiting: "En espera",
  done: "Completada",
};
export function suggestions(tasks: Task[]) {
  const now = today();
  return tasks
    .filter((t) => !t.deletedAt && t.status !== "done")
    .sort((a, b) => {
      const score = (t: Task) =>
        (t.due
          ? Math.max(
              0,
              30 -
                Math.round(
                  (new Date(t.due).getTime() - new Date(now).getTime()) /
                    86400000,
                ),
            ) * 2
          : 0) +
        { low: 0, medium: 10, high: 20, urgent: 30 }[t.priority] +
        (t.status === "progress" ? 5 : 0);
      return score(b) - score(a);
    })
    .slice(0, 3);
}
export function validateImport(x: unknown): x is State {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    [
      "tasks",
      "notes",
      "events",
      "subjects",
      "projects",
      "sessions",
      "priorities",
    ].every((k) => Array.isArray(s[k])) &&
    !!s.settings &&
    typeof s.settings === "object" &&
    (s.tasks as unknown[]).every(
      (t) =>
        !!t &&
        typeof t === "object" &&
        typeof (t as Task).id === "string" &&
        typeof (t as Task).title === "string",
    )
  );
}
