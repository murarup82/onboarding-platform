"use client";

import { useEffect, useState } from "react";

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

    async function load() {
        const res = await fetch("/api/tasks");
        const json = await res.json();
        setTasks(json.data ?? []);
    }

    useEffect(() => {
        load();
    }, []);

    async function createTask(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);

        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // If you set TASK_API_KEY in env, add it also here later via server-side (we’ll improve auth soon)
            },
            body: JSON.stringify({ title, department: dept }),
        });

        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setMsg(j.error ?? "Failed");
            return;
        }

        setTitle("");
        setMsg("Created ✅");
        await load();
        setTimeout(() => setMsg(null), 1500);
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
                {tasks.map((t) => (
                    <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {t.department} • {t.status} • {t.priority}
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && <div style={{ opacity: 0.7 }}>No tasks yet.</div>}
            </div>
        </main>
    );
}
