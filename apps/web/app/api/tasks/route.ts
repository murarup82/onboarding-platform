import { prisma } from "../../../lib/db";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

// Simple MVP shared secret to avoid random internet calls.
// Put TASK_API_KEY in Portainer env vars.
const API_KEY = process.env.TASK_API_KEY;

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));

    // Optional protection (strongly recommended since it's public behind your domain)
    const headerKey = req.headers.get("x-api-key");
    if (API_KEY && headerKey !== API_KEY) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const title = String(body.title ?? "").trim();
    const department = String(body.department ?? "").trim() || "HR";

    if (!title) {
        return Response.json({ error: "title required" }, { status: 400 });
    }

    const task = await prisma.task.create({
        data: {
            title,
            department,
            // defaults for status/priority already in schema
        },
    });

    return Response.json({ data: task }, { status: 201 });
}

export async function GET() {
    // simple list
    const tasks = await prisma.task.findMany({ orderBy: [{ createdAt: "desc" }] });
    return Response.json({ data: tasks });
}
