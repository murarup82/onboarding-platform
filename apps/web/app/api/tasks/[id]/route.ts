import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../lib/db";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

function mapError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
        return "Database not reachable. Check DATABASE_URL and network connectivity.";
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return "Database rejected the query. Ensure migrations have been applied.";
    }
    if (error instanceof Error) return error.message;
    return "Unexpected server error.";
}

function handleError(error: unknown, status = 500) {
    console.error("[/api/tasks/[id]]", error);
    return Response.json({ error: mapError(error) }, { status });
}

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const PRIORITIES = ["LOW", "MED", "HIGH", "CRITICAL"] as const;
const OWNER_ROLES = ["HR_ADMIN", "DEPT_OWNER", "HIRING_MANAGER", "EMPLOYEE", "SYS_ADMIN"] as const;

function parseDate(input: unknown) {
    if (!input) return undefined;
    const d = new Date(String(input));
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function isValid<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));
        const current = await prisma.task.findUnique({ where: { id: params.id } });
        if (!current) return Response.json({ error: "not found" }, { status: 404 });

        const data: Prisma.TaskUpdateInput = {};

        if (body.status !== undefined) {
            if (!isValid(body.status, STATUSES)) return Response.json({ error: "invalid status" }, { status: 400 });
            data.status = body.status as Prisma.TaskUpdateInput["status"];
        }
        if (body.priority !== undefined) {
            if (!isValid(body.priority, PRIORITIES)) return Response.json({ error: "invalid priority" }, { status: 400 });
            data.priority = body.priority as Prisma.TaskUpdateInput["priority"];
        }
        if (body.assignedToEmail !== undefined) data.assignedToEmail = body.assignedToEmail || null;
        if (body.ownerRole !== undefined) {
            if (body.ownerRole && !isValid(body.ownerRole, OWNER_ROLES)) return Response.json({ error: "invalid ownerRole" }, { status: 400 });
            data.ownerRole = body.ownerRole || null;
        }
        if (body.evidenceNote !== undefined) data.evidenceNote = body.evidenceNote || null;
        if (body.evidenceUrl !== undefined) data.evidenceUrl = body.evidenceUrl || null;
        if (body.dueDate !== undefined) data.dueDate = parseDate(body.dueDate) ?? null;

        if (Object.keys(data).length === 0) {
            return Response.json({ error: "no fields to update" }, { status: 400 });
        }

        // Enforce evidence for required tasks when marking DONE
        const nextStatus = (data.status as Prisma.TaskUncheckedUpdateInput["status"]) ?? current.status;
        const nextEvidenceNote = (data.evidenceNote as string | null | undefined) ?? current.evidenceNote;
        const nextEvidenceUrl = (data.evidenceUrl as string | null | undefined) ?? current.evidenceUrl;
        if (nextStatus === "DONE" && current.isRequired && !nextEvidenceNote && !nextEvidenceUrl) {
            return Response.json({ error: "required tasks need evidenceNote or evidenceUrl before completion" }, { status: 400 });
        }

        const updated = await prisma.task.update({
            where: { id: params.id },
            data,
        });

        return Response.json({ data: updated }, { status: 200 });
    } catch (error) {
        return handleError(error);
    }
}
