"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Case = {
    id: string;
    title: string;
    employeeEmail: string;
    department: string;
    status: string;
    startDate?: string | null;
    createdAt: string;
    templateVersion?: { id: string; versionNumber: number; templateId: string } | null;
    _count?: { tasks: number };
};

type TemplateVersion = {
    id: string;
    versionNumber: number;
    status: string;
    template: { id: string; name: string; department: string };
};

export default function CasesPage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const [title, setTitle] = useState("");
    const [employeeEmail, setEmployeeEmail] = useState("");
    const [department, setDepartment] = useState("");
    const [startDate, setStartDate] = useState("");
    const [templateVersionId, setTemplateVersionId] = useState("");

    async function loadCases() {
        setLoading(true);
        setMsg(null);
        try {
            const res = await fetch("/api/cases");
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to load cases (${res.status})`);
                setCases([]);
                return;
            }
            setCases(json?.data ?? []);
        } catch (error) {
            console.error("load cases", error);
            setMsg("Failed to load cases.");
            setCases([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadTemplateVersions() {
        try {
            const res = await fetch("/api/templates");
            const json = await res.json().catch(() => null);
            if (!res.ok) return;
            const versions: TemplateVersion[] = [];
            for (const tpl of json?.data ?? []) {
                for (const v of tpl.versions ?? []) {
                    if (v.status === "PUBLISHED") {
                        versions.push({
                            id: v.id,
                            versionNumber: v.versionNumber,
                            status: v.status,
                            template: { id: tpl.id, name: tpl.name, department: tpl.department },
                        });
                    }
                }
            }
            versions.sort((a, b) => b.versionNumber - a.versionNumber);
            setTemplateVersions(versions);
        } catch (error) {
            console.error("load template versions", error);
        }
    }

    useEffect(() => {
        loadCases();
        loadTemplateVersions();
    }, []);

    async function onCreateCase(e: FormEvent) {
        e.preventDefault();
        setMsg(null);
        setCreating(true);

        const payload: Record<string, unknown> = {
            title: title.trim(),
            employeeEmail: employeeEmail.trim(),
            department: department.trim(),
        };
        if (startDate) payload.startDate = startDate;
        if (templateVersionId) payload.templateVersionId = templateVersionId;

        if (!payload.title || !payload.employeeEmail || !payload.department) {
            setMsg("Title, Employee Email, and Department are required.");
            setCreating(false);
            return;
        }

        try {
            const res = await fetch("/api/cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                setMsg(json?.error ?? `Failed to create case (${res.status})`);
                return;
            }
            setMsg("Case created.");
            setTitle("");
            setEmployeeEmail("");
            setDepartment("");
            setStartDate("");
            setTemplateVersionId("");
            await loadCases();
            setTimeout(() => setMsg(null), 1500);
        } catch (error) {
            console.error("create case", error);
            setMsg("Failed to create case.");
        } finally {
            setCreating(false);
        }
    }

    return (
        <main>
            <h1>Cases</h1>
            {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}

            <section style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, marginBottom: 24 }}>
                <h3 style={{ marginTop: 0 }}>New Case</h3>
                <form onSubmit={onCreateCase} style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Title</span>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Employee Email</span>
                            <input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Department</span>
                            <input value={department} onChange={(e) => setDepartment(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Start Date</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                            <span>Template Version (published)</span>
                            <select
                                value={templateVersionId}
                                onChange={(e) => setTemplateVersionId(e.target.value)}
                                style={{ padding: 8 }}
                            >
                                <option value="">-- none --</option>
                                {templateVersions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.template.name} v{v.versionNumber} ({v.template.department})
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div>
                        <button type="submit" style={{ padding: "10px 14px" }} disabled={creating}>
                            {creating ? "Creating..." : "Create case"}
                        </button>
                    </div>
                </form>
            </section>

            <section>
                <h3 style={{ marginTop: 0 }}>Existing Cases</h3>
                {loading && <div style={{ opacity: 0.7 }}>Loading cases...</div>}
                {!loading && cases.length === 0 && <div style={{ opacity: 0.7 }}>No cases yet.</div>}
                <div style={{ display: "grid", gap: 12 }}>
                    {cases.map((c) => (
                        <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                        {c.employeeEmail} | Dept: {c.department} | Status: {c.status}
                                        {c.startDate ? ` | Starts: ${c.startDate}` : ""}
                                    </div>
                                </div>
                                <Link href={`/cases/${c.id}`} style={{ padding: "6px 10px" }}>
                                    View
                                </Link>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                                Tasks: {c._count?.tasks ?? 0} {c.templateVersion ? `| Template v${c.templateVersion.versionNumber}` : ""}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
