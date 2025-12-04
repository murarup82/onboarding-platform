import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/db";

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
    console.error("[/api/tasks/[id]/checklist]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const task = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!task) return Response.json({ error: "task not found" }, { status: 404 });
        const items = await prisma.checklistItem.findMany({
            where: { taskId: params.id },
            orderBy: [{ createdAt: "asc" }],
        });
        return Response.json({ data: items });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));
        const label = String(body.label ?? "").trim();
        if (!label) return Response.json({ error: "label required" }, { status: 400 });

        const task = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!task) return Response.json({ error: "task not found" }, { status: 404 });

        const created = await prisma.checklistItem.create({
            data: { taskId: params.id, label },
        });

        return Response.json({ data: created }, { status: 201 });
    } catch (error) {
        return handleError(error);
    }
}
