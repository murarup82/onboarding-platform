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
        const priority = (body.priority as Prisma.TaskUncheckedCreateInput["priority"]) ?? undefined;
        const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
        const ownerRole = body.ownerRole as Prisma.TaskUncheckedCreateInput["ownerRole"];
        const assignedToEmail = body.assignedToEmail ? String(body.assignedToEmail) : undefined;

        if (!title) {
            return Response.json({ error: "title required" }, { status: 400 });
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
        const tasks = await prisma.task.findMany({
            where: { caseId },
            orderBy: [{ createdAt: "desc" }],
        });
        return Response.json({ data: tasks });
    } catch (error) {
        return handleError(error);
    }
}
