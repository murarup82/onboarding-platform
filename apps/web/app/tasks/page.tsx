import { prisma } from "../../lib/db";

// Force dynamic rendering so Next.js does not prerender this page at build time.
// This prevents build-time invocation of Prisma (which requires DATABASE_URL).
export const dynamic = "force-dynamic";

export default async function TasksPage() {
    let tasks = [];
    try {
        tasks = await prisma.task.findMany({ orderBy: [{ createdAt: "desc" }] });
    } catch (err) {
        // If DATABASE_URL is missing during build or runtime, return empty list.
        // The error will still surface in production logs; this keeps the build safe.
        // eslint-disable-next-line no-console
        console.error('Prisma query failed in TasksPage:', err);
        tasks = [];
    }

    return (
        <main>
            <h1>Tasks</h1>
            <p>Showing {tasks.length} tasks from Postgres.</p>
            <ul>
                {tasks.map(t => (
                    <li key={t.id}>
                        <b>{t.title}</b> — {t.department} — {t.status} — {t.priority}
                    </li>
                ))}
            </ul>
        </main>
    );
}
