import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Task, TaskList } from "../types.js";
import { createListsSlice, type ListsSlice } from "./lists.js";
import { seedLists, seedTasks } from "./seed.js";
import { fileStorage } from "./storage.js";
import { createTasksSlice, type TasksSlice } from "./tasks.js";
import { createUiSlice, type UiSlice } from "./ui.js";

export type Store = TasksSlice & ListsSlice & UiSlice;

export type PersistedState = { lists: TaskList[]; tasks: Task[] };

export type Mutators = [["zustand/persist", unknown]];

const isPersistedState = (value: unknown): value is PersistedState =>
    typeof value === "object" &&
    value !== null &&
    Array.isArray(Reflect.get(value, "lists")) &&
    Array.isArray(Reflect.get(value, "tasks"));

export const useStore = create<Store>()(
    persist(
        (...a) => ({
            ...createTasksSlice(...a),
            ...createListsSlice(...a),
            ...createUiSlice(...a),
        }),
        {
            name: "tasks",
            version: 1,
            storage: createJSONStorage(() => fileStorage),
            partialize: (state): PersistedState => ({ lists: state.lists, tasks: state.tasks }),
            migrate: (persisted) => (isPersistedState(persisted) ? persisted : { lists: seedLists, tasks: seedTasks }),
        },
    ),
);
