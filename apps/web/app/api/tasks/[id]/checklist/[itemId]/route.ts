import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../../lib/db";

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
    console.error("[/api/tasks/[id]/checklist/[itemId]]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));
        const data: Prisma.ChecklistItemUpdateInput = {};
        if (body.label !== undefined) data.label = String(body.label ?? "");
        if (body.completed !== undefined) data.completed = Boolean(body.completed);
        if (body.completed !== undefined) data.completedAt = body.completed ? new Date() : null;

        if (Object.keys(data).length === 0) return Response.json({ error: "no fields to update" }, { status: 400 });

        const item = await prisma.checklistItem.findUnique({
            where: { id: params.itemId },
            select: { id: true, taskId: true },
        });
        if (!item || item.taskId !== params.id) return Response.json({ error: "not found" }, { status: 404 });

        const updated = await prisma.checklistItem.update({
            where: { id: params.itemId },
            data,
        });
        return Response.json({ data: updated }, { status: 200 });
    } catch (error) {
        return handleError(error);
    }
}
