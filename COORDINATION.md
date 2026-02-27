# Coordination Protocol (Lobster ↔ Codex)

## The Problem
- Lobster (me) and Codex (coding agent) both push to the same GitHub repo
- Race conditions cause push conflicts
- Need a reliable protocol for coordinated work

## The Solution

### 1. **Always Pull Before You Start**
```bash
git pull --rebase
```

### 2. **Use Workdir Isolation**
When spawning Codex for a task, always set `workdir`:
```bash
codex exec --full-auto "Your task" --workdir ~/.openclaw/workspace/nerve-v3
```

This ensures Codex doesn't wander into other projects.

### 3. **Communication Protocol**

#### Lobster (me):
- Check git status before starting work
- Pull latest changes
- Make atomic commits (one fix = one commit)
- Push immediately after committing
- Update Codex if I push while it's working

#### Codex:
- Always check git status before starting
- Pull before making changes
- Commit with clear messages (`fix(db): ...`, `feat(api): ...`)
- Push immediately after committing
- Notify me when done via:
  ```bash
  openclaw system event --text "Done: [summary]" --mode now
  ```

### 4. **Conflict Resolution**
If push fails with "rejected (fetch first)":
```bash
git pull --rebase  # Rebase your commits on top of remote
git push
```

### 5. **Deploy to Prod**
After pushing to main:
```bash
vercel --prod --yes --force
```

**Why `--force`?** Bypasses git author validation (since commits may come from different authors: `lobster@nerve.ai`, `gtomasello90@gmail.com`, etc.)

### 6. **Background Tasks**
For long-running Codex sessions:
- Start with `background:true` and `pty:true`
- Monitor with `process action:log sessionId:XXX`
- Don't kill unless truly stuck (give it time!)
- Lobster will check in periodically

### 7. **Testing Before Deploy**
- Run `npm run build` locally to catch TypeScript errors
- Check `npm run lint` for style issues
- Review Codex's diff before pushing:
  ```bash
  git diff
  git log --oneline -1
  ```

### 8. **Production DB Sync (Turso)**
When you add a new field to Prisma schema:
```bash
# 1. Run local migration
npm run prisma:push

# 2. Sync production DB (Turso)
turso db shell nerve-v3 "ALTER TABLE [TableName] ADD COLUMN [columnName] [TYPE];"

# 3. Add indexes if needed (check schema)
turso db shell nerve-v3 "CREATE INDEX [TableName_columnName_idx] ON [TableName]([columnName]);"

# 4. Verify
turso db shell nerve-v3 "SELECT sql FROM sqlite_master WHERE type='table' AND name='[TableName]';"
```

**Why?** Vercel deploys Prisma client with the new schema, but Turso DB needs manual column addition.

## Best Practices
✅ **Pull, fix, commit, push** — atomic workflow  
✅ **Descriptive commits** — `fix(council): add missing qwenAnalysis parsing`  
✅ **Immediate deploy** — don't let fixes sit on main  
✅ **Notify on completion** — keep me in the loop  

❌ **Don't batch commits** — small, frequent is better  
❌ **Don't hold changes** — push as soon as ready  
❌ **Don't assume sync** — always pull first  

## Example Workflow

### Lobster finds a bug:
```bash
cd ~/.openclaw/workspace/nerve-v3
git pull --rebase
# Spawns Codex with the fix
codex exec --full-auto "Fix X in file Y" --workdir ~/.openclaw/workspace/nerve-v3
# Codex commits + pushes
git pull --rebase  # I sync
vercel --prod --yes --force  # Deploy
```

### Codex working autonomously:
```bash
# Inside Codex session:
git pull --rebase
# Make changes
git add -A
git commit -m "feat(api): add new endpoint"
git push origin main
# Notify Lobster
openclaw system event --text "Done: Added new endpoint" --mode now
```

---

**Updated:** Feb 11, 2026 — after fixing the Council page qwenAnalysis bug
