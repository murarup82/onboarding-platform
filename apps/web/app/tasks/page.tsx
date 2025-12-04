import { prisma } from "../../lib/db";

export default async function TasksPage() {
    const tasks = await prisma.task.findMany({ orderBy: [{ createdAt: "desc" }] });

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
