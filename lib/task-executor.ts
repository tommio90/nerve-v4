import OpenAI from "openai";
import { db } from "@/lib/db";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

type LogLevel = "INFO" | "WARN" | "ERROR";

type ExecutionResult = {
  title: string;
  content: string;
  summary: string;
  category: string;
  artifactType: "DOCUMENT" | "RESEARCH" | "ANALYSIS" | "TRANSCRIPT" | "MEDIA" | "DATA";
  source?: string;
};

type TaskWithProject = Awaited<ReturnType<typeof getTaskForExecution>>;

type ResearchSource = {
  url: string;
  title: string;
  snippet: string;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractResponseText(response: unknown): string {
  const outputText = (response as { output_text?: unknown }).output_text;
  if (typeof outputText === "string" && outputText.trim().length > 0) {
    return outputText;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    if (!("content" in item) || !Array.isArray((item as { content?: unknown }).content)) continue;

    for (const contentPart of (item as { content: unknown[] }).content) {
      if (!contentPart || typeof contentPart !== "object") continue;
      if ((contentPart as { type?: string }).type !== "output_text") continue;
      const text = (contentPart as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }

  return chunks.join("\n").trim();
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueUrls(input: string, max = 6): string[] {
  const matches = input.match(/https?:\/\/[^\s)\]>",]+/g) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const cleaned = match.replace(/[.,;]+$/, "");
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      urls.push(cleaned);
    }
    if (urls.length >= max) break;
  }

  return urls;
}

async function logExecution(taskId: string, message: string, level: LogLevel = "INFO") {
  await db.executionLog.create({
    data: {
      taskId,
      message,
      level,
    },
  });
}

async function getTaskForExecution(taskId: string) {
  return db.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
}

async function generateWithGpt4o(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are NERVE v4's autonomous execution engine. Produce practical, high-quality markdown with clear structure.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
  });

  const text = extractResponseText(response);
  if (!text) throw new Error("Model returned empty output");
  return text;
}

async function generateWithGeminiFlash(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return generateWithGpt4o(prompt);
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are NERVE v4's research synthesizer. Return concise but complete markdown with explicit source references.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed: ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Gemini model returned empty output");
  return text;
}

async function webFetch(url: string): Promise<{ url: string; text: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NERVE-v4-task-executor/1.0",
      Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url} with status ${response.status}`);
  }

  const body = await response.text();
  const text = stripHtml(body).slice(0, 5000);
  return { url, text };
}

async function runResearchTask(task: NonNullable<TaskWithProject>, executionContext?: string): Promise<ExecutionResult> {
  await logExecution(task.id, "Running web search for research sources.");

  const query = [task.title, task.description, task.deliverable].filter(Boolean).join("\n");

  const searchResponse = await openai.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Research this task and return markdown with a short findings summary and source URLs.",
              "",
              "Task:",
              query,
              executionContext?.trim() ? `\nAdditional execution context:\n${executionContext.trim()}` : "",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const searchSummary = extractResponseText(searchResponse);
  if (!searchSummary) {
    throw new Error("Web search returned no result text");
  }

  await logExecution(task.id, "Web search completed. Extracting and fetching source pages.");

  const urls = uniqueUrls(searchSummary, 6);
  const fetchedSources: ResearchSource[] = [];

  for (const url of urls) {
    try {
      const fetched = await webFetch(url);
      fetchedSources.push({
        url,
        title: url,
        snippet: fetched.text,
      });
      await logExecution(task.id, `Fetched source: ${url}`);
    } catch (error) {
      await logExecution(
        task.id,
        `Could not fetch source ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "WARN",
      );
    }
  }

  const synthesisPrompt = [
    "Create a research report in markdown.",
    "Include:",
    "1) Executive Summary",
    "2) Key Findings",
    "3) Implications for this task",
    "4) Open Risks / Unknowns",
    "5) Sources section with URLs",
    "",
    `Task Title: ${task.title}`,
    `Task Description: ${task.description}`,
    `Deliverable: ${task.deliverable}`,
    executionContext?.trim() ? `Additional execution context: ${executionContext.trim()}` : "",
    "",
    "Web search output:",
    searchSummary,
    "",
    "Fetched source snippets:",
    fetchedSources.length > 0
      ? fetchedSources
          .map((source, index) => `Source ${index + 1}: ${source.url}\n${source.snippet}`)
          .join("\n\n")
      : "No source pages could be fetched. Use web search summary only and mark confidence lower.",
  ].join("\n");

  await logExecution(task.id, "Synthesizing research report with Gemini 2.5 Flash.");
  const content = await generateWithGeminiFlash(synthesisPrompt);

  return {
    title: `${task.title} - Research Findings`,
    content,
    summary: `Research execution completed with ${fetchedSources.length} fetched source(s).`,
    category: "TASK_EXECUTION_RESEARCH",
    artifactType: "RESEARCH",
    source: fetchedSources.map((source) => source.url).join(", "),
  };
}

async function runGeneralTask(task: NonNullable<TaskWithProject>, executionContext?: string): Promise<ExecutionResult> {
  const artifactByType: Record<string, ExecutionResult["artifactType"]> = {
    CONTENT: "DOCUMENT",
    ANALYSIS: "ANALYSIS",
    OUTREACH: "DOCUMENT",
    PHONE_CALL: "TRANSCRIPT",
    CUSTOM: "DOCUMENT",
  };

  const typeInstructions: Record<string, string> = {
    CONTENT: "Generate polished deliverable content in final form.",
    ANALYSIS: "Produce a detailed analysis with assumptions, key insights, and recommendations.",
    OUTREACH: "Create an outreach strategy with audience segments, messaging templates, and next steps.",
    PHONE_CALL: "Create a practical phone call briefing and script with opening, questions, objections, and close.",
    CUSTOM:
      "Try to execute directly. If scope is unclear, create an execution plan with assumptions, decisions needed, and immediate next steps.",
  };

  const maybeUnclearCustom =
    task.type === "CUSTOM" &&
    (!task.deliverable || task.deliverable.trim().length < 12 || task.description.trim().length < 24);

  const prompt = [
    `Task Type: ${task.type}`,
    `Task Title: ${task.title}`,
    `Task Description: ${task.description}`,
    `Deliverable: ${task.deliverable || "(none provided)"}`,
    "",
    typeInstructions[task.type] || typeInstructions.CUSTOM,
    maybeUnclearCustom
      ? "The input is unclear. Prioritize an execution plan document over speculative final output."
      : "Produce a complete output that can be used immediately.",
    executionContext?.trim() ? `Additional execution context:\n${executionContext.trim()}` : "",
    "",
    "Output markdown with clear sections, explicit assumptions, and actionable details.",
  ].join("\n");

  await logExecution(task.id, "Generating task output with GPT-4o.");
  const content = await generateWithGpt4o(prompt);

  return {
    title: `${task.title} - ${maybeUnclearCustom ? "Execution Plan" : "Execution Output"}`,
    content,
    summary: `${task.type} task execution completed.`,
    category: `TASK_EXECUTION_${task.type}`,
    artifactType: artifactByType[task.type] || "DOCUMENT",
  };
}

async function persistExecutionArtifacts(task: NonNullable<TaskWithProject>, result: ExecutionResult) {
  const requiredTags = task.type === "RESEARCH" || result.category === "TASK_EXECUTION_RESEARCH" ? ["task-research"] : [];
  const doc = await db.doc.create({
    data: {
      title: result.title,
      summary: result.summary,
      content: result.content,
      category: result.category,
      venture: task.project.title,
      source: result.source,
      tags: serializeTags(
        buildDocTags({
          title: result.title,
          content: result.content,
          category: result.category,
          venture: task.project.title,
          source: result.source,
          requiredTags,
        }),
      ),
    },
  });

  const artifactContent = [
    `# ${result.title}`,
    "",
    result.summary,
    "",
    `Linked doc: /docs/${doc.id}`,
  ].join("\n");

  const artifact = await db.artifact.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      title: result.title,
      type: result.artifactType,
      mimeType: "text/markdown",
      content: artifactContent,
      filePath: `/docs/${doc.id}`,
      sizeBytes: Buffer.byteLength(result.content, "utf8"),
    },
  });

  return { doc, artifact };
}

async function transitionToQueuedIfNeeded(task: NonNullable<TaskWithProject>) {
  if (task.status === "APPROVED") {
    await db.task.update({ where: { id: task.id }, data: { status: "QUEUED" } });
    await logExecution(task.id, "Task approved and queued for execution.");
  }
}

export async function executeTask(taskId: string, executionContext?: string) {
  const task = await getTaskForExecution(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  if (!["APPROVED", "QUEUED"].includes(task.status)) {
    throw new Error(`Task status ${task.status} is not executable. Expected APPROVED or QUEUED.`);
  }

  await transitionToQueuedIfNeeded(task);

  await db.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
  await logExecution(task.id, "Execution started.");
  if (executionContext?.trim()) {
    await logExecution(task.id, "Additional context provided by user and included in execution prompt.");
  }

  try {
    const result =
      task.type === "RESEARCH"
        ? await runResearchTask(task, executionContext)
        : await runGeneralTask(task, executionContext);

    const { doc, artifact } = await persistExecutionArtifacts(task, result);

    const updatedTask = await db.task.update({
      where: { id: task.id },
      data: { status: "COMPLETE" },
      include: {
        project: true,
        executionLog: { orderBy: { timestamp: "desc" } },
        artifacts: { orderBy: { createdAt: "desc" } },
      },
    });

    await logExecution(task.id, `Execution completed. Created doc ${doc.id} and artifact ${artifact.id}.`);

    return { task: updatedTask, doc, artifact };
  } catch (error) {
    await db.task.update({ where: { id: task.id }, data: { status: "FAILED" } });
    await logExecution(task.id, `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`, "ERROR");
    throw error;
  }
}
