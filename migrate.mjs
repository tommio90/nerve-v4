// Migrate data from NERVE v2 to v3
const V2 = "https://nerve-v2.vercel.app";
const V3 = "https://nerve-v3.vercel.app";

async function migrate() {
  // 1. Migrate failed docs only
  console.log("=== Migrating Docs ===");
  const docs = await fetch(`${V2}/api/docs`).then(r => r.json());
  for (const meta of docs) {
    const full = await fetch(`${V2}/api/docs/${meta.id}`).then(r => r.json());
    const body = {
      title: full.title,
      content: full.content,
      summary: full.summary || null,
      category: full.category || null,
      venture: full.venture || null,
      source: full.source || "migrated-v2",
    };
    const res = await fetch(`${V3}/api/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    console.log(`  ✓ ${full.title} → ${result.doc?.id || "FAILED: " + JSON.stringify(result)}`);
  }

  // 2. Migrate project
  console.log("\n=== Migrating Projects ===");
  const projects = await fetch(`${V2}/api/projects`).then(r => r.json());
  const statusMap = { active: "ACTIVE", proposed: "PROPOSED", completed: "COMPLETED", archived: "ARCHIVED" };
  
  for (const p of projects) {
    const body = {
      title: p.title,
      description: p.description || "",
      status: statusMap[p.status] || "PROPOSED",
      thesisScore: 0.8,
      scope: "L",
      reasoning: p.description || "Migrated from NERVE v2",
    };
    const res = await fetch(`${V3}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    const projectId = result.project?.id;
    console.log(`  ✓ ${p.title} → ${projectId || "FAILED"}`);

    // Migrate tasks under this project
    if (p.tasks && projectId) {
      for (const t of p.tasks) {
        const taskStatusMap = { pending: "PROPOSED", approved: "APPROVED", running: "IN_PROGRESS", completed: "COMPLETE", failed: "FAILED", rejected: "FAILED" };
        const taskBody = {
          projectId,
          title: t.title,
          description: t.description || t.title,
          deliverable: t.deliverable || "Deliverable from v2 migration",
          type: "CUSTOM",
          modelTier: "BALANCED",
          priority: t.priority || 3,
          status: taskStatusMap[t.status] || "PROPOSED",
        };
        const tres = await fetch(`${V3}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskBody),
        });
        const tresult = await tres.json();
        console.log(`    → Task: ${t.title} (${tresult.task?.id || "FAILED"})`);
      }
    }
  }

  // 3. Migrate memory files as knowledge documents
  console.log("\n=== Migrating Memory ===");
  try {
    const memRes = await fetch(`${V2}/api/memory`);
    if (memRes.ok) {
      const memory = await memRes.json();
      if (memory.preferences) {
        // Save task preferences as a knowledge document
        const body = {
          title: "Task Preference Memory (v2)",
          content: typeof memory.preferences === "string" ? memory.preferences : JSON.stringify(memory.preferences, null, 2),
          summary: "Migrated task preference memory from NERVE v2",
          category: "strategy",
          source: "migrated-v2",
        };
        const res = await fetch(`${V3}/api/docs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        console.log(`  ✓ Task preferences → ${result.doc?.id || "FAILED"}`);
      }
    }
  } catch (e) {
    console.log("  ⚠ Memory endpoint not available");
  }

  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
