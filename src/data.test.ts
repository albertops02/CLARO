import { describe, it, expect } from "vitest";
import {
  suggestions,
  validateImport,
  initial,
  normalizeState,
  type Task,
} from "./data";
const task = (id: string, due?: string): Task => ({
  id,
  title: id,
  description: "",
  area: "study",
  due,
  status: "pending",
  priority: "medium",
  minutes: 30,
  createdAt: "2026-01-01",
  subtasks: [],
  tags: [],
});
describe("datos críticos", () => {
  it("no incluye tareas completadas ni eliminadas en sugerencias", () => {
    const a = task("a");
    a.status = "done";
    const b = task("b");
    b.deletedAt = "2026-01-01";
    expect(suggestions([a, b, task("c")]).map((t) => t.id)).toEqual(["c"]);
  });
  it("rechaza importaciones incompletas", () => {
    expect(validateImport({ tasks: [] })).toBe(false);
    expect(validateImport(initial)).toBe(true);
  });
  it("actualiza copias antiguas con los nuevos módulos académicos", () => {
    const legacy = { ...initial, exams: undefined, templates: undefined };
    const normalized = normalizeState(legacy);
    expect(normalized.exams).toEqual([]);
    expect(normalized.templates.length).toBeGreaterThan(0);
  });
});
