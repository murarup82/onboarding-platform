"use client";

import { useEffect, useState, type FormEvent } from "react";

type Task = {
    id: string;
    title: string;
    department: string;
    status: string;
    priority: string;
    createdAt: string;
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [dept, setDept] = useState("HR");
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        setMsg(null);
        try {
            const res = await fetch("/api/tasks");
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
    }, []);

    async function createTask(e: FormEvent) {
        e.preventDefault();
        setMsg(null);

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title, department: dept }),
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

    return (
        <main>
            <h1>Tasks</h1>

            <form onSubmit={createTask} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    style={{ padding: 8, minWidth: 260 }}
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
                <button type="submit" style={{ padding: "8px 12px" }}>Add</button>
                {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
            </form>

            <hr style={{ margin: "16px 0" }} />

            <div style={{ display: "grid", gap: 10 }}>
                {loading && <div style={{ opacity: 0.7 }}>Loading tasks...</div>}
                {tasks.map((t) => (
                    <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {t.department} | {t.status} | {t.priority}
                        </div>
                    </div>
                ))}
                {!loading && tasks.length === 0 && <div style={{ opacity: 0.7 }}>No tasks yet.</div>}
            </div>
        </main>
    );
}
