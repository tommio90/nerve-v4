CREATE TABLE "OKR" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "quarter" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "KeyResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "okrId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "target" REAL NOT NULL,
  "current" REAL NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ON_TRACK',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KeyResult_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "OKR" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Assumption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "riskLevel" INTEGER NOT NULL DEFAULT 3,
  "status" TEXT NOT NULL DEFAULT 'UNVALIDATED',
  "confidence" REAL NOT NULL DEFAULT 0,
  "evidence" TEXT NOT NULL DEFAULT '',
  "projectId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AgentNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "capabilities" TEXT NOT NULL DEFAULT '[]',
  "tools" TEXT NOT NULL DEFAULT '[]',
  "memoryScope" TEXT NOT NULL DEFAULT '[]',
  "reportingTo" TEXT,
  "approvalTier" TEXT NOT NULL DEFAULT 'soft',
  "status" TEXT NOT NULL DEFAULT 'idle',
  "config" TEXT NOT NULL DEFAULT '{}',
  "okrLinks" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Persona" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "archetype" TEXT NOT NULL DEFAULT '',
  "demographics" TEXT NOT NULL DEFAULT '{}',
  "goals" TEXT NOT NULL DEFAULT '[]',
  "pains" TEXT NOT NULL DEFAULT '[]',
  "behaviors" TEXT NOT NULL DEFAULT '[]',
  "dayInLife" TEXT NOT NULL DEFAULT '',
  "aiAdoptionReadiness" REAL NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CRMContact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "linkedin" TEXT,
  "twitter" TEXT,
  "organization" TEXT,
  "personaId" TEXT,
  "personaScore" REAL NOT NULL DEFAULT 0,
  "pipelineStage" TEXT NOT NULL DEFAULT 'LEAD',
  "pains" TEXT NOT NULL DEFAULT '[]',
  "objections" TEXT NOT NULL DEFAULT '[]',
  "signals" TEXT NOT NULL DEFAULT '[]',
  "followUps" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Interview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contactId" TEXT NOT NULL,
  "transcript" TEXT NOT NULL DEFAULT '',
  "questions" TEXT NOT NULL DEFAULT '[]',
  "insights" TEXT NOT NULL DEFAULT '[]',
  "assumptions" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" DATETIME,
  "completedAt" DATETIME,
  "followUpSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Interview_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OKR_status_idx" ON "OKR"("status");
CREATE INDEX "OKR_quarter_idx" ON "OKR"("quarter");
CREATE INDEX "KeyResult_okrId_idx" ON "KeyResult"("okrId");
CREATE INDEX "KeyResult_status_idx" ON "KeyResult"("status");
CREATE INDEX "Assumption_status_idx" ON "Assumption"("status");
CREATE INDEX "Assumption_riskLevel_idx" ON "Assumption"("riskLevel");
CREATE INDEX "AgentNode_role_idx" ON "AgentNode"("role");
CREATE INDEX "AgentNode_status_idx" ON "AgentNode"("status");
CREATE INDEX "CRMContact_pipelineStage_idx" ON "CRMContact"("pipelineStage");
CREATE INDEX "CRMContact_personaId_idx" ON "CRMContact"("personaId");
CREATE INDEX "Interview_contactId_idx" ON "Interview"("contactId");
CREATE INDEX "Interview_status_idx" ON "Interview"("status");
