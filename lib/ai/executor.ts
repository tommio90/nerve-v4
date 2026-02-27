import { db } from "@/lib/db";

export async function executeTask(taskId: string) {
  await db.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" } });
  await db.executionLog.create({
    data: {
      taskId,
      message: "Execution started.",
      level: "INFO",
    },
  });

  const updated = await db.task.update({ where: { id: taskId }, data: { status: "COMPLETE" } });

  await db.executionLog.create({
    data: {
      taskId,
      message: "Execution completed.",
      level: "INFO",
    },
  });

  return updated;
}
