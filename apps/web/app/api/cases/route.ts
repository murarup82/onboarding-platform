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
    console.error("[/api/cases]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function GET() {
    try {
        requireEnv("DATABASE_URL");
        const cases = await prisma.case.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                templateVersion: { select: { id: true, versionNumber: true, templateId: true } },
                _count: { select: { tasks: true } },
            },
        });
        return Response.json({ data: cases });
    } catch (error) {
        return handleError(error);
    }
}

type CreateCaseInput = {
    title: string;
    employeeEmail: string;
    department: string;
    startDate?: string | null;
    templateVersionId?: string | null;
};

export async function POST(req: Request) {
    try {
        requireEnv("DATABASE_URL");
        const body = (await req.json().catch(() => ({}))) as CreateCaseInput;

        const title = String(body.title ?? "").trim();
        const employeeEmail = String(body.employeeEmail ?? "").trim();
        const department = String(body.department ?? "").trim();
        const startDate = body.startDate ? new Date(body.startDate) : null;
        const templateVersionId = body.templateVersionId ?? null;

        if (!title) return Response.json({ error: "title required" }, { status: 400 });
        if (!employeeEmail) return Response.json({ error: "employeeEmail required" }, { status: 400 });
        if (!department) return Response.json({ error: "department required" }, { status: 400 });

        const created = await prisma.$transaction(async (tx) => {
            let templateVersion: Prisma.TemplateVersionGetPayload<{ include: { tasks: true } }> | null = null;
            if (templateVersionId) {
                templateVersion = await tx.templateVersion.findUnique({
                    where: { id: templateVersionId },
                    include: { tasks: true },
                });
                if (!templateVersion) throw new Error("template version not found");
                if (templateVersion.status !== "PUBLISHED") throw new Error("template version not published");
            }

            const newCase = await tx.case.create({
                data: {
                    title,
                    employeeEmail,
                    department,
                    startDate: startDate ?? undefined,
                    templateVersionId: templateVersion?.id,
                },
            });

            if (templateVersion?.tasks?.length) {
                const taskData = templateVersion.tasks.map((t) => {
                    const due =
                        startDate && typeof t.dueOffsetDays === "number"
                            ? new Date(startDate.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
                            : null;
                    return {
                        title: t.title,
                        department: t.department,
                        priority: t.priority,
                        isRequired: t.isRequired,
                        ownerRole: t.ownerRole,
                        dueDate: due,
                        caseId: newCase.id,
                    };
                });

                await tx.task.createMany({ data: taskData });
            }

            return newCase.id;
        });

        const fullCase = await prisma.case.findUnique({
            where: { id: created },
            include: { tasks: { orderBy: { createdAt: "desc" } }, templateVersion: true },
        });

        return Response.json({ data: fullCase }, { status: 201 });
    } catch (error) {
        return handleError(error);
    }
}
