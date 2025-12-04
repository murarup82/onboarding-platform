"use client";

import { useEffect, useState, type FormEvent } from "react";

type TemplateTask = {
    id?: string;
    title: string;
    department?: string;
    ownerRole?: string | null;
    dueOffsetDays?: number | null;
    priority?: string;
    isRequired?: boolean;
    order?: number | null;
};

type TemplateVersion = {
    id: string;
    versionNumber: number;
    status: string;
    publishedAt?: string | null;
    tasks: TemplateTask[];
};

type Template = {
    id: string;
    name: string;
    department: string;
    description?: string | null;
    status: string;
    latestVersionNumber: number;
    updatedAt: string;
    versions: TemplateVersion[];
};

type TaskFormRow = {
    title: string;
    department: string;
    ownerRole: string;
    dueOffsetDays: string;
    priority: string;
    isRequired: boolean;
};

const ownerRoles = ["HR_ADMIN", "DEPT_OWNER", "HIRING_MANAGER", "EMPLOYEE", "SYS_ADMIN"];
const priorities = ["LOW", "MED", "HIGH", "CRITICAL"];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [department, setDepartment] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [tasks, setTasks] = useState<TaskFormRow[]>([
        { title: "", department: "", ownerRole: "", dueOffsetDays: "", priority: "MED", isRequired: true },
    ]);

    async function loadTemplates() {
        setLoading(true);
        setMsg(null);
        try {
            const res = await fetch("/api/templates");
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to load templates (${res.status})`);
                setTemplates([]);
                return;
            }
            setTemplates(json?.data ?? []);
        } catch (error) {
            console.error("load templates", error);
            setMsg("Failed to load templates.");
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTemplates();
    }, []);

    function updateTaskRow(idx: number, patch: Partial<TaskFormRow>) {
        setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    }

    function addTaskRow() {
        setTasks((prev) => [...prev, { title: "", department: "", ownerRole: "", dueOffsetDays: "", priority: "MED", isRequired: true }]);
    }

    function removeTaskRow(idx: number) {
        setTasks((prev) => prev.filter((_, i) => i !== idx));
    }

    async function onCreateTemplate(e: FormEvent) {
        e.preventDefault();
        setMsg(null);
        setCreating(true);

        const trimmedName = name.trim();
        const trimmedDept = department.trim();
        if (!trimmedName || !trimmedDept) {
            setMsg("Name and Department are required.");
            setCreating(false);
            return;
        }

        const taskPayload: TemplateTask[] = [];
        for (const t of tasks) {
            const title = t.title.trim();
            if (!title) continue;

            const due =
                t.dueOffsetDays === ""
                    ? null
                    : Number(t.dueOffsetDays);
            if (due !== null && Number.isNaN(due)) {
                setMsg("Due offset days must be a number.");
                setCreating(false);
                return;
            }

            taskPayload.push({
                title,
                department: t.department.trim() || undefined,
                ownerRole: t.ownerRole || undefined,
                dueOffsetDays: due,
                priority: t.priority || "MED",
                isRequired: t.isRequired,
            });
        }

        try {
            const res = await fetch("/api/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmedName,
                    department: trimmedDept,
                    description: description.trim() || undefined,
                    tasks: taskPayload,
                }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to create template (${res.status})`);
                return;
            }
            setMsg("Template created.");
            setName("");
            setDepartment("");
            setDescription("");
            setTasks([{ title: "", department: "", ownerRole: "", dueOffsetDays: "", priority: "MED", isRequired: true }]);
            await loadTemplates();
            setTimeout(() => setMsg(null), 1500);
        } catch (error) {
            console.error("create template", error);
            setMsg("Failed to create template.");
        } finally {
            setCreating(false);
        }
    }

    async function publishTemplate(id: string) {
        setMsg(null);
        try {
            const res = await fetch(`/api/templates/${id}/publish`, { method: "POST" });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to publish (${res.status})`);
                return;
            }
            setMsg("Template published.");
            await loadTemplates();
            setTimeout(() => setMsg(null), 1500);
        } catch (error) {
            console.error("publish template", error);
            setMsg("Failed to publish template.");
        }
    }

    return (
        <main>
            <h1>Templates</h1>
            <div style={{ marginBottom: 16, opacity: 0.8 }}>Create templates with tasks, then publish to generate cases from versions.</div>
            {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}

            <section style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>New Template</h3>
                <form onSubmit={onCreateTemplate} style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Name</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Department</span>
                            <input value={department} onChange={(e) => setDepartment(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Description</span>
                            <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: 8 }} />
                        </label>
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h4 style={{ margin: 0 }}>Tasks</h4>
                            <button type="button" onClick={addTaskRow} style={{ padding: "6px 10px" }}>
                                + Add task
                            </button>
                        </div>
                        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                            {tasks.map((t, idx) => (
                                <div key={idx} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
                                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                                        <label style={{ display: "grid", gap: 4 }}>
                                            <span>Title</span>
                                            <input
                                                value={t.title}
                                                onChange={(e) => updateTaskRow(idx, { title: e.target.value })}
                                                style={{ padding: 8 }}
                                            />
                                        </label>
                                        <label style={{ display: "grid", gap: 4 }}>
                                            <span>Department (optional)</span>
                                            <input
                                                value={t.department}
                                                onChange={(e) => updateTaskRow(idx, { department: e.target.value })}
                                                style={{ padding: 8 }}
                                            />
                                        </label>
                                        <label style={{ display: "grid", gap: 4 }}>
                                            <span>Owner Role</span>
                                            <select
                                                value={t.ownerRole}
                                                onChange={(e) => updateTaskRow(idx, { ownerRole: e.target.value })}
                                                style={{ padding: 8 }}
                                            >
                                                <option value="">Unassigned</option>
                                                {ownerRoles.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label style={{ display: "grid", gap: 4 }}>
                                            <span>Priority</span>
                                            <select
                                                value={t.priority}
                                                onChange={(e) => updateTaskRow(idx, { priority: e.target.value })}
                                                style={{ padding: 8 }}
                                            >
                                                {priorities.map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label style={{ display: "grid", gap: 4 }}>
                                            <span>Due offset (days from start)</span>
                                            <input
                                                type="number"
                                                value={t.dueOffsetDays}
                                                onChange={(e) => updateTaskRow(idx, { dueOffsetDays: e.target.value })}
                                                style={{ padding: 8 }}
                                            />
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                                            <input
                                                type="checkbox"
                                                checked={t.isRequired}
                                                onChange={(e) => updateTaskRow(idx, { isRequired: e.target.checked })}
                                            />
                                            <span>Required</span>
                                        </label>
                                    </div>
                                    {tasks.length > 1 && (
                                        <div>
                                            <button type="button" onClick={() => removeTaskRow(idx)} style={{ padding: "6px 10px" }}>
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <button type="submit" style={{ padding: "10px 14px" }} disabled={creating}>
                            {creating ? "Creating..." : "Create template"}
                        </button>
                    </div>
                </form>
            </section>

            <section>
                <h3 style={{ marginTop: 0 }}>Existing Templates</h3>
                {loading && <div style={{ opacity: 0.7 }}>Loading templates...</div>}
                {!loading && templates.length === 0 && <div style={{ opacity: 0.7 }}>No templates yet.</div>}
                <div style={{ display: "grid", gap: 12 }}>
                    {templates.map((tpl) => {
                        const latest = tpl.versions?.[0];
                        return (
                            <div key={tpl.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                                            Dept: {tpl.department} | Status: {tpl.status} | Latest v{tpl.latestVersionNumber}
                                        </div>
                                    </div>
                                    {latest && latest.status !== "PUBLISHED" && (
                                        <button onClick={() => publishTemplate(tpl.id)} style={{ padding: "6px 10px" }}>
                                            Publish latest
                                        </button>
                                    )}
                                </div>
                                {latest && (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                                            Latest Version v{latest.versionNumber} ({latest.status})
                                        </div>
                                        <div style={{ display: "grid", gap: 6 }}>
                                            {latest.tasks.length === 0 && <div style={{ opacity: 0.7 }}>No tasks in this version.</div>}
                                            {latest.tasks.map((t) => (
                                                <div key={t.id ?? t.title} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                                        {t.department || tpl.department} | {t.priority} | {t.isRequired ? "Required" : "Optional"}
                                                        {typeof t.dueOffsetDays === "number" ? ` | Due: start +${t.dueOffsetDays}d` : ""}
                                                        {t.ownerRole ? ` | Owner: ${t.ownerRole}` : ""}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
