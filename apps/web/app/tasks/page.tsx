"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Task = {
    id: string;
    title: string;
    department: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";
    priority: string;
    createdAt: string;
    dueDate?: string | null;
    ownerRole?: string | null;
    assignedToEmail?: string | null;
    caseId?: string | null;
    evidenceNote?: string | null;
    evidenceUrl?: string | null;
    checklist?: ChecklistItem[];
};

type ChecklistItem = {
    id: string;
    label: string;
    completed: boolean;
};

const STATUSES: Task["status"][] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];
const PRIORITIES = ["LOW", "MED", "HIGH", "CRITICAL"];

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [dept, setDept] = useState("HR");
    const [priority, setPriority] = useState("MED");
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [filterDept, setFilterDept] = useState("");
    const [filterStatus, setFilterStatus] = useState<Task["status"] | "">("");
    const [filterPriority, setFilterPriority] = useState<string>("");
    const [checklists, setChecklists] = useState<Record<string, { items: ChecklistItem[]; newLabel: string }>>({});

    const grouped = useMemo(() => {
        const g: Record<Task["status"], Task[]> = {
            NOT_STARTED: [],
            IN_PROGRESS: [],
            BLOCKED: [],
            DONE: [],
        };
        for (const t of tasks) g[t.status].push(t);
        return g;
    }, [tasks]);

    async function load() {
        setLoading(true);
        setMsg(null);
        try {
            const url = new URL("/api/tasks", window.location.origin);
            if (filterDept) url.searchParams.set("department", filterDept);
            if (filterStatus) url.searchParams.set("status", filterStatus);
            if (filterPriority) url.searchParams.set("priority", filterPriority);
            const res = await fetch(url.toString());
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to load tasks (${res.status})`);
                setTasks([]);
                return;
            }
            setTasks(json?.data ?? []);
        } catch (error) {
            console.error("load tasks", error);
            setMsg("Failed to load tasks.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDept, filterStatus, filterPriority]);

    async function createTask(e: FormEvent) {
        e.preventDefault();
        setMsg(null);

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title, department: dept, priority }),
            });

            const j = await res.json().catch(() => null);

            if (!res.ok) {
                setMsg(j?.error ?? `Failed (${res.status})`);
                return;
            }

            setTitle("");
            setMsg("Created.");
            await load();
            setTimeout(() => setMsg(null), 1500);
        } catch (error) {
            console.error("create task", error);
            setMsg("Failed to create task.");
        }
    }

    async function updateTask(id: string, patch: Partial<Task>) {
        setMsg(null);
        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const j = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(j?.error ?? `Failed to update task (${res.status})`);
                return;
            }
            await load();
        } catch (error) {
            console.error("update task", error);
            setMsg("Failed to update task.");
        }
    }

    async function loadChecklist(taskId: string) {
        try {
            const res = await fetch(`/api/tasks/${taskId}/checklist`);
            const json = await res.json().catch(() => null);
            if (!res.ok) return;
            setChecklists((prev) => ({
                ...prev,
                [taskId]: { items: json?.data ?? [], newLabel: prev[taskId]?.newLabel ?? "" },
            }));
        } catch (error) {
            console.error("load checklist", error);
        }
    }

    function Checklist({
        taskId,
        loadChecklist,
        itemsState,
        setItemsState,
    }: {
        taskId: string;
        loadChecklist: (taskId: string) => Promise<void>;
        itemsState?: { items: ChecklistItem[]; newLabel: string };
        setItemsState: React.Dispatch<React.SetStateAction<Record<string, { items: ChecklistItem[]; newLabel: string }>>>;
    }) {
        const items = itemsState?.items ?? [];
        const newLabel = itemsState?.newLabel ?? "";

        async function toggle(itemId: string, completed: boolean) {
            await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            });
            await loadChecklist(taskId);
        }

        async function addItem() {
            const label = newLabel.trim();
            if (!label) return;
            await fetch(`/api/tasks/${taskId}/checklist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label }),
            });
            setItemsState((prev) => ({ ...prev, [taskId]: { items, newLabel: "" } }));
            await loadChecklist(taskId);
        }

        return (
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 6, marginTop: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Checklist</div>
                <div style={{ display: "grid", gap: 4 }}>
                    {items.length === 0 && <div style={{ opacity: 0.7 }}>No items.</div>}
                    {items.map((c) => (
                        <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="checkbox" checked={c.completed} onChange={(e) => toggle(c.id, e.target.checked)} />
                            <span>{c.label}</span>
                        </label>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                        value={newLabel}
                        onChange={(e) => setItemsState((prev) => ({ ...prev, [taskId]: { items, newLabel: e.target.value } }))}
                        placeholder="Add item"
                        style={{ padding: 6, flex: 1 }}
                    />
                    <button type="button" onClick={addItem} style={{ padding: "6px 10px" }}>
                        Add
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main>
            <h1>Tasks</h1>

            <form onSubmit={createTask} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    style={{ padding: 8, minWidth: 240 }}
                />
                <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ padding: 8 }}>
                    <option>HR</option>
                    <option>IT</option>
                    <option>FIN</option>
                    <option>FAC</option>
                    <option>SEC</option>
                    <option>LEGAL</option>
                    <option>HM</option>
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: 8 }}>
                    {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                    ))}
                </select>
                <button type="submit" style={{ padding: "8px 12px" }}>Add</button>
                {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
            </form>

            <hr style={{ margin: "16px 0" }} />

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span>Filter dept</span>
                    <input value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ padding: 6 }} />
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span>Status</span>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Task["status"] | "")} style={{ padding: 6 }}>
                        <option value="">All</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span>Priority</span>
                    <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ padding: 6 }}>
                        <option value="">All</option>
                        {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </label>
                {loading && <span style={{ opacity: 0.7 }}>Loading...</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {STATUSES.map((status) => (
                    <div key={status} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, background: "#fafafa" }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{status.replace("_", " ")}</div>
                        <div style={{ display: "grid", gap: 8 }}>
                            {grouped[status].length === 0 && <div style={{ opacity: 0.6 }}>No tasks</div>}
                            {grouped[status].map((t) => (
                                <div key={t.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 8, background: "white" }}>
                                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                        {t.department} | {t.priority}
                                        {t.dueDate ? ` | Due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                                        <select
                                            value={t.status}
                                            onChange={(e) => updateTask(t.id, { status: e.target.value as Task["status"] })}
                                            style={{ padding: 6 }}
                                        >
                                            {STATUSES.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            placeholder="Assign email"
                                            value={t.assignedToEmail ?? ""}
                                            onChange={(e) => updateTask(t.id, { assignedToEmail: e.target.value || null })}
                                            style={{ padding: 6, minWidth: 140 }}
                                        />
                                    </div>
                                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                                        <input
                                            placeholder="Evidence URL"
                                            value={t.evidenceUrl ?? ""}
                                            onChange={(e) => updateTask(t.id, { evidenceUrl: e.target.value || null })}
                                            style={{ padding: 6 }}
                                        />
                                        <textarea
                                            placeholder="Evidence note"
                                            value={t.evidenceNote ?? ""}
                                            onChange={(e) => updateTask(t.id, { evidenceNote: e.target.value || null })}
                                            style={{ padding: 6, minHeight: 50 }}
                                        />
                                    </div>
                                    <Checklist
                                        taskId={t.id}
                                        loadChecklist={loadChecklist}
                                        itemsState={checklists[t.id]}
                                        setItemsState={setChecklists}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
