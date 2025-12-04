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
