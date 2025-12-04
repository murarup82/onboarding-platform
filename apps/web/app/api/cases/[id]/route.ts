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
    console.error("[/api/cases/[id]]", error);
    return Response.json({ error: mapError(error) }, { status });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
    try {
        requireEnv("DATABASE_URL");
        const data = await prisma.case.findUnique({
            where: { id: params.id },
            include: {
                templateVersion: true,
                tasks: { orderBy: { createdAt: "desc" } },
            },
        });
        if (!data) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json({ data });
    } catch (error) {
        return handleError(error);
    }
}
