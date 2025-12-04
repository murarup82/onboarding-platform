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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));
        const data: Prisma.TaskUpdateInput = {};

        if (body.status) data.status = body.status as Prisma.TaskUpdateInput["status"];
        if (body.priority) data.priority = body.priority as Prisma.TaskUpdateInput["priority"];
        if (body.assignedToEmail !== undefined) data.assignedToEmail = body.assignedToEmail || null;
        if (body.ownerRole !== undefined) data.ownerRole = body.ownerRole as Prisma.TaskUpdateInput["ownerRole"];
        if (body.evidenceNote !== undefined) data.evidenceNote = body.evidenceNote || null;
        if (body.evidenceUrl !== undefined) data.evidenceUrl = body.evidenceUrl || null;
        if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

        if (Object.keys(data).length === 0) {
            return Response.json({ error: "no fields to update" }, { status: 400 });
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
