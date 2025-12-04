import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/db";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

// Simple MVP shared secret to avoid random internet calls.
// Put TASK_API_KEY in Portainer env vars.
const API_KEY = process.env.TASK_API_KEY;
const PRIORITIES = ["LOW", "MED", "HIGH", "CRITICAL"] as const;
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const OWNER_ROLES = ["HR_ADMIN", "DEPT_OWNER", "HIRING_MANAGER", "EMPLOYEE", "SYS_ADMIN"] as const;

function parseDate(input: unknown) {
    if (!input) return undefined;
    const d = new Date(String(input));
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function isValid<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === "string" && (allowed as readonly string[]).includes(value);
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
    // Log full error server-side, return a safe summary to the client.
    console.error("[/api/tasks]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function POST(req: Request) {
    try {
        // Fail fast when misconfigured.
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));

        // Optional protection (strongly recommended since it's public behind your domain)
        const headerKey = req.headers.get("x-api-key");
        if (API_KEY && headerKey !== API_KEY) {
            return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const title = String(body.title ?? "").trim();
        const department = String(body.department ?? "").trim() || "HR";
        const caseId = body.caseId ? String(body.caseId) : undefined;
        const priority = isValid(body.priority, PRIORITIES) ? body.priority : "MED";
        const dueDate = parseDate(body.dueDate);
        const ownerRole = isValid(body.ownerRole, OWNER_ROLES)
            ? (body.ownerRole as Prisma.TaskUncheckedCreateInput["ownerRole"])
            : undefined;
        const assignedToEmail = body.assignedToEmail ? String(body.assignedToEmail) : undefined;

        if (!title) {
            return Response.json({ error: "title required" }, { status: 400 });
        }

        if (caseId) {
            const exists = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
            if (!exists) return Response.json({ error: "caseId not found" }, { status: 400 });
        }

        const task = await prisma.task.create({
            data: {
                title,
                department,
                priority,
                dueDate,
                ownerRole,
                assignedToEmail,
                caseId,
                // defaults for status/priority already in schema
            },
        });

        return Response.json({ data: task }, { status: 201 });
    } catch (error) {
        return handleError(error);
    }
}

export async function GET(req: Request) {
    try {
        requireEnv("DATABASE_URL");
        const url = new URL(req.url);
        const caseId = url.searchParams.get("caseId") ?? undefined;
        const department = url.searchParams.get("department") ?? undefined;
        const statusParams = url.searchParams.getAll("status");
        const statuses = statusParams.flatMap((s) => s.split(",")).filter(Boolean) as Prisma.TaskWhereInput["status"][];
        const tasks = await prisma.task.findMany({
            where: {
                caseId,
                department,
                status: statuses.length ? { in: statuses } : undefined,
            },
            orderBy: [{ createdAt: "desc" }],
        });
        return Response.json({ data: tasks });
    } catch (error) {
        return handleError(error);
    }
}
