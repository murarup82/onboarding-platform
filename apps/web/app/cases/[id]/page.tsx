"use client";

import { useEffect, useState } from "react";

type Task = {
    id: string;
    title: string;
    department: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    isRequired: boolean;
    ownerRole?: string | null;
    assignedToEmail?: string | null;
    evidenceNote?: string | null;
    evidenceUrl?: string | null;
};

type CaseDetail = {
    id: string;
    title: string;
    employeeEmail: string;
    department: string;
    status: string;
    startDate?: string | null;
    templateVersion?: { id: string; versionNumber: number } | null;
    tasks: Task[];
};

export default function CaseDetailPage({ params }: { params: { id: string } }) {
    const [data, setData] = useState<CaseDetail | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [checklists, setChecklists] = useState<Record<string, { items: ChecklistItem[]; newLabel: string }>>({});

type ChecklistItem = {
    id: string;
    label: string;
    completed: boolean;
    completedAt?: string | null;
};

    async function load() {
        setLoading(true);
        setMsg(null);
        try {
            const res = await fetch(`/api/cases/${params.id}`);
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to load case (${res.status})`);
                setData(null);
                return;
            }
            setData(json?.data ?? null);
        } catch (error) {
            console.error("load case detail", error);
            setMsg("Failed to load case.");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [params.id]);

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

    async function updateTask(id: string, patch: Partial<Task>) {
        setUpdatingId(id);
        setMsg(null);
        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to update task (${res.status})`);
                return;
            }
            await load();
            await loadChecklist(id);
        } catch (error) {
            console.error("update task", error);
            setMsg("Failed to update task.");
        } finally {
            setUpdatingId(null);
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
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Checklist</div>
                <div style={{ display: "grid", gap: 6 }}>
                    {items.length === 0 && <div style={{ opacity: 0.7 }}>No checklist items yet.</div>}
                    {items.map((c) => (
                        <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="checkbox" checked={c.completed} onChange={(e) => toggle(c.id, e.target.checked)} />
                            <span>{c.label}</span>
                        </label>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                        value={newLabel}
                        onChange={(e) =>
                            setItemsState((prev) => ({ ...prev, [taskId]: { items, newLabel: e.target.value } }))
                        }
                        placeholder="Add checklist item"
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
            <h1>Case</h1>
            {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}
            {loading && <div style={{ opacity: 0.7 }}>Loading...</div>}
            {!loading && !data && <div style={{ opacity: 0.7 }}>Not found.</div>}
            {data && (
                <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{data.title}</div>
                        <div style={{ opacity: 0.75, fontSize: 13 }}>
                            {data.employeeEmail} | Dept: {data.department} | Status: {data.status}
                            {data.startDate ? ` | Starts: ${data.startDate}` : ""}
                            {data.templateVersion ? ` | Template v${data.templateVersion.versionNumber}` : ""}
                        </div>
                    </div>

                    <div>
                        <h3 style={{ marginTop: 0 }}>Tasks</h3>
                        {data.tasks.length === 0 && <div style={{ opacity: 0.7 }}>No tasks yet.</div>}
                            <div style={{ display: "grid", gap: 10 }}>
                                {data.tasks.map((t) => (
                                    <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{t.title}</div>
                                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                                                {t.department} | {t.priority} | {t.status} | {t.isRequired ? "Required" : "Optional"}
                                                {t.dueDate ? ` | Due: ${t.dueDate}` : ""}
                                                {t.ownerRole ? ` | Owner: ${t.ownerRole}` : ""}
                                                {t.assignedToEmail ? ` | Assigned: ${t.assignedToEmail}` : ""}
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span>Status</span>
                                                    <select
                                                        value={t.status}
                                                        onChange={(e) => updateTask(t.id, { status: e.target.value as Task["status"] })}
                                                        disabled={updatingId === t.id}
                                                        style={{ padding: 6 }}
                                                    >
                                                        <option value="NOT_STARTED">NOT_STARTED</option>
                                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                        <option value="BLOCKED">BLOCKED</option>
                                                        <option value="DONE">DONE</option>
                                                    </select>
                                                </label>
                                                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                    <span>Assign</span>
                                                    <input
                                                        value={t.assignedToEmail ?? ""}
                                                        onChange={(e) => updateTask(t.id, { assignedToEmail: e.target.value || null })}
                                                        disabled={updatingId === t.id}
                                                        style={{ padding: 6 }}
                                                    />
                                                </label>
                                            </div>
                                            <div style={{ display: "grid", gap: 6 }}>
                                                <label style={{ display: "grid", gap: 4 }}>
                                                    <span>Evidence URL</span>
                                                    <input
                                                        value={t.evidenceUrl ?? ""}
                                                        onChange={(e) => updateTask(t.id, { evidenceUrl: e.target.value || null })}
                                                        placeholder="https://..."
                                                        disabled={updatingId === t.id}
                                                        style={{ padding: 6 }}
                                                    />
                                                </label>
                                                <label style={{ display: "grid", gap: 4 }}>
                                                    <span>Evidence Note</span>
                                                    <textarea
                                                        value={t.evidenceNote ?? ""}
                                                        onChange={(e) => updateTask(t.id, { evidenceNote: e.target.value || null })}
                                                        disabled={updatingId === t.id}
                                                        style={{ padding: 6, minHeight: 60 }}
                                                    />
                                                </label>
                                            </div>
                                            <div>
                                                <Checklist taskId={t.id} loadChecklist={loadChecklist} itemsState={checklists[t.id]} setItemsState={setChecklists} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
