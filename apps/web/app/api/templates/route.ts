import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/db";

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
    console.error("[/api/templates]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function GET() {
    try {
        requireEnv("DATABASE_URL");
        const templates = await prisma.template.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" },
                    include: { tasks: { orderBy: { order: "asc" } } },
                },
            },
        });
        return Response.json({ data: templates });
    } catch (error) {
        return handleError(error);
    }
}

type TemplateTaskInput = {
    title: string;
    department?: string;
    ownerRole?: Prisma.$Enums.OwnerRole;
    dueOffsetDays?: number | null;
    priority?: Prisma.Priority;
    isRequired?: boolean;
    order?: number;
};

export async function POST(req: Request) {
    try {
        requireEnv("DATABASE_URL");
        const body = await req.json().catch(() => ({}));
        const name = String(body.name ?? "").trim();
        const department = String(body.department ?? "").trim();
        const description = body.description ? String(body.description) : null;
        const tasks = Array.isArray(body.tasks) ? (body.tasks as TemplateTaskInput[]) : [];

        if (!name) return Response.json({ error: "name required" }, { status: 400 });
        if (!department) return Response.json({ error: "department required" }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const template = await tx.template.create({
                data: { name, department, description: description ?? undefined },
            });

            const version = await tx.templateVersion.create({
                data: {
                    templateId: template.id,
                    versionNumber: 1,
                    status: "DRAFT",
                },
            });

            if (tasks.length) {
                await tx.templateTask.createMany({
                    data: tasks.map((t, idx) => ({
                        templateVersionId: version.id,
                        title: String(t.title ?? "").trim(),
                        department: String(t.department ?? department),
                        ownerRole: t.ownerRole,
                        dueOffsetDays: t.dueOffsetDays ?? null,
                        priority: t.priority ?? "MED",
                        isRequired: t.isRequired ?? true,
                        order: t.order ?? idx,
                    })),
                });
            }

            return { templateId: template.id, versionId: version.id };
        });

        const created = await prisma.template.findUnique({
            where: { id: result.templateId },
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" },
                    include: { tasks: { orderBy: { order: "asc" } } },
                },
            },
        });

        return Response.json({ data: created }, { status: 201 });
    } catch (error) {
        return handleError(error);
    }
}
