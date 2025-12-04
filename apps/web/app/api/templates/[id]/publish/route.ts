import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/db";

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
    console.error("[/api/templates/[id]/publish]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const templateId = params.id;

        const result = await prisma.$transaction(async (tx) => {
            const template = await tx.template.findUnique({
                where: { id: templateId },
                include: { versions: { orderBy: { versionNumber: "desc" } } },
            });
            if (!template) throw new Error("template not found");

            const latest = template.versions[0];
            if (!latest) throw new Error("no versions to publish");
            if (latest.status === "PUBLISHED") return template;

            await tx.templateVersion.update({
                where: { id: latest.id },
                data: { status: "PUBLISHED", publishedAt: new Date() },
            });

            await tx.template.update({
                where: { id: template.id },
                data: {
                    status: "PUBLISHED",
                    latestVersionNumber: latest.versionNumber,
                },
            });

            return await tx.template.findUnique({
                where: { id: template.id },
                include: {
                    versions: {
                        orderBy: { versionNumber: "desc" },
                        include: { tasks: { orderBy: { order: "asc" } } },
                    },
                },
            });
        });

        return Response.json({ data: result }, { status: 200 });
    } catch (error) {
        return handleError(error);
    }
}
