# Kasuku Studio — Agent Instructions

> You are working inside the **Kasuku Studio** workspace.
> Kasuku Studio is a web design studio based in Kenya, building websites for local businesses.
> This file is read automatically at the start of every session.

---

## Step 1 — Read the Studio Brain (ALWAYS FIRST)

Before doing anything else, read:

```
F:\Work\Websites\.agents\KNOWLEDGE.md
```

This contains:
- Tool & API preferences
- Design conventions for Kenyan market
- Post-launch checklist (run on every site)
- Common mistakes to avoid
- Lessons learned from all past projects

**Apply everything in KNOWLEDGE.md without being asked.**

---

## Step 2 — Identify the Project

Ask the owner which client/project you are working on today, or they will tell you upfront.

All client websites live at:
```
F:\Work\Websites\[Client Name]\
```

Once you know the project, read:
```
F:\Work\Websites\[Client Name]\.agent\state.md
```

This contains the client profile, tech stack, decisions already made, and open items.
If `state.md` does not exist yet, create it using the template in:
```
F:\Work\Websites\.agents\skills\project-state\state_template.md
```

---

## Step 3 — Work

Build, debug, design — whatever the session requires.
Apply all lessons from `KNOWLEDGE.md` automatically throughout.

---

## Step 4 — End of Session (MANDATORY — do not skip)

At the end of **every** session, before closing, you MUST do all of the following without being asked:

### 4a — Update state.md
- Add a new row to the Session Log with today's date and a 1-line summary of what was done
- Update Open Items (check off completed tasks, add new ones discovered)
- Record any new decisions made with the reason why

### 4b — Log lessons to KNOWLEDGE.md
- Review what happened during the session
- Extract any lessons that are **generalizable** (would help on a different client's site too)
- Ask yourself: *"Would this help me on a site for a completely different client?"*
  - ✅ Yes → write it directly into the relevant section of `KNOWLEDGE.md`
  - ❌ No (client-specific only) → record it in `state.md` instead
- Write lessons as **general rules**, not client-specific notes
  - ❌ Wrong: "Dr. Kamau's M-Pesa timed out"
  - ✅ Right: "Always add a 10s retry on M-Pesa API payment calls"

### 4c — Tell the owner
Briefly summarize what you logged:
> *"Session complete. I've updated state.md and added [N] lessons to KNOWLEDGE.md: [list them]. See you next time."*

---

## Studio Overview

| Detail | Value |
|--------|-------|
| **Studio name** | Kasuku Studio |
| **Location** | Kenya |
| **Market** | Kenyan local businesses |
| **Workspace root** | `F:\Work\Websites\` |
| **Studio brain** | `F:\Work\Websites\.agents\KNOWLEDGE.md` |
| **Lessons inbox** | `F:\Work\Websites\.agents\lessons_log.md` |
| **Per-project state** | `[ProjectFolder]\.agent\state.md` |

---

## Key Principle

> You are responsible for the studio's memory.
> The owner should never have to repeat a lesson twice.
> If something is worth knowing, you write it down — automatically, every session.

---

*Be pragmatic. Be reliable. Self-anneal. Remember everything.*
