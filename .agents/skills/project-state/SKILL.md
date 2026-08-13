---
name: project-state
description: >
  Manages the per-project state file (.agent/state.md). Use this skill to read,
  initialize, or update the project state — client profile, tech stack, decisions
  made, open items, and session log. Always read state.md at the start of a session
  on an existing project. If it does not exist, create it from state_template.md.
---

# Project State Skill

## Purpose

Every client project has a `.agent/state.md` file that acts as its working memory:
- Who the client is and how they like to communicate
- What tech stack is being used and why
- Decisions that have already been made (so we don't revisit them)
- What's still open and needs doing
- A log of every session — what was done and when

## When to Read It

Read `.agent/state.md` at the **start of every session** before doing any work.
This prevents repeating questions the client has already answered.

## When to Update It

- When a significant decision is made (record the decision AND the reason)
- When you learn something specific about this client's preferences
- When tasks are completed or new ones are discovered
- At the **end of every session** — add a session log entry

## Creating a New State File

If `[ProjectFolder]\.agent\state.md` does not exist:
1. Copy `F:\Work\Websites\.agents\skills\project-state\state_template.md`
2. Save it as `[ProjectFolder]\.agent\state.md`
3. Replace all `{{PLACEHOLDERS}}` with actual values
4. Fill in what you know; leave the rest blank for later

## Promoting Lessons

At the end of a project (or periodically), review the "Lessons From This Project" section.
For each lesson that is generalizable (would help on a different client's site):
- Write it as a general rule in the relevant section of `F:\Work\Websites\.agents\KNOWLEDGE.md`
- Mark it as promoted in `state.md`
