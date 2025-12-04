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
    }, [filterDept]);

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
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
