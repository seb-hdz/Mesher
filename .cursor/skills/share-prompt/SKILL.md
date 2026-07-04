---
name: share-prompt
description: >-
  Produces a shareable implementation prompt in a fixed format (code block, @ file
  refs, reference list). Use only when the user wants to improve a prompt to copy or
  share with another agent/session in that format. Do not use for general rewriting,
  casual clarification, or implementing the task itself.
---

# Share Prompt

Transform the user's request into a **shareable** prompt: one fenced code block (delivery wrapper only), plain-text body, `@` file paths, and a closing reference list — ready to paste into another chat or Agent session.

## Activation gate (required)

Apply this skill **only if all are true**:

1. The user wants a **prompt mejorado para compartir** (copy/paste, otro chat, otro agente, PR description, handoff), not solo una respuesta conversacional.
2. The deliverable must follow the **formato compartible** defined in [Output rules](#output-rules) (bloque ` ``` `, cuerpo en texto plano, `@ruta`, sección final de archivos).
3. The user did **not** ask to implement the change in this same turn (unless they ask for both explicitly: first the prompt, then code).

If any condition fails → **do not use this skill**. Answer normally (prosa, bullets, implementación directa, etc.).

### Signals to apply

- "mejora este prompt para compartir", "devuélvelo en un bloque de código para compartir", "formato para compartir/agent"
- "prompt para Agent mode", "brief para otro chat", "handoff"
- Pide explícitamente `@` paths + lista de archivos de referencia

### Signals to skip

- "explícame", "¿cómo funciona?", "revisa este código" sin pedir prompt exportable
- "mejora la redacción" de un mensaje/email/doc sin formato de agente
- "implementa", "haz el fix", "aplica el cambio" sin pedir antes un prompt compartible

### If ambiguous

Ask one short question before applying:

> ¿Quieres el resultado como **prompt compartible** (bloque de código con `@archivos` y lista de referencia) o como **respuesta normal** en el chat?

## When to apply

Same as [Activation gate](#activation-gate-required): only when the improved prompt will be shared using this format.

## Workflow

0. **Confirm gate** — Re-read [Activation gate](#activation-gate-required). Abort skill if the user only wants a normal reply.
1. **Understand intent** — Goal, constraints, and what "done" looks like.
2. **Trace the codebase** — Find real paths and the data/control flow (read-only search/read).
3. **Draft the prompt** — Use the output template below; be specific, not verbose. Example data (JSON, logs) as plain text — no nested ` ``` ` inside the body.
4. **Deliver** — Return **only** the improved prompt inside one fenced code block (see Output rules). No extra commentary outside the fence unless the user asked for it.

Do **not** implement any changes unless the user explicitly asks after receiving the prompt.

## Output rules

The improved prompt MUST follow all of these:

| Rule            | Requirement                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapper         | Entire prompt inside a single ` ``` ` code fence (language tag optional: `text` or none).                                                                     |
| Nested fences   | **Forbidden** inside the prompt body. Only the outer wrapper may use ` ``` `. For JSON, errors, logs, or snippets, paste plain text (indent if needed) — never ` ```json `, ` ```ts `, etc. Example: write `{ "key": "value" }` directly, not fenced. |
| Body style      | **Texto plano** inside the fence. Allowed: `-` / `*` bullets, numbered lists (`1.`), backticks for literals (`code`, `TBD`), labels ending with `:`, blank lines. **Forbidden in the body:** markdown headings (`#`, `##`), bold/italic (`**`, `_`), links (`[text](url)`), HTML, tables, task checkboxes (`- [ ]`). |
| File refs       | Every project file path prefixed with `@` and **no space** after `@`. Example: `@packages/checkout/src/payment/CredibancoPSEProvider.ts`                      |
| Paths           | Relative to the **repository root** (posix `/`, no leading `./`).                                                                                             |
| Line refs       | When citing a range, append after path: `@path/to/file.ts:162-179`                                                                                            |
| Closing section | End with a plain label `Archivos de referencia:` (or `Reference files:` if the user wrote in English) listing **only** the `@` paths used, one per line, no duplicates. |

## Prompt template

Use this structure inside the code block (adapt labels to the user's language). Section titles are plain lines ending with `:` — not `#` headings.

```text
[Título breve del objetivo]

Contexto:
[Qué pasa hoy y por qué importa — 2-4 oraciones]

Flujo actual:
1. @path/to/entry.tsx — [rol en el flujo]
2. @path/to/service.ts — [qué hace]
...

Problema / Objetivo:
Actual: ...
Deseado: ...
[Datos de ejemplo si aplica — JSON en texto plano, sin fences internos]

Criterios de aceptación:
- ...
- ...

Restricciones:
- ...

Notas de implementación (opcional):
- ...

Archivos de referencia:
@apps/...
@packages/...
```

## Quality checklist

Before returning the prompt, verify:

- [ ] Every `@` path exists in the repo (or mark as `TBD` if unknown).
- [ ] Flow order matches real call chain (UI → provider → service → types).
- [ ] Acceptance criteria are testable (manual or automated); listed as plain bullets, not `- [ ]` checkboxes.
- [ ] Body uses plain text only (no `#` / `##` / `**` / markdown links).
- [ ] No implementation code in the prompt unless the user pasted a snippet as context.
- [ ] Placeholder/filter/example data copied accurately from the user.
- [ ] No nested ` ``` ` inside the prompt (only the global wrapper); example payloads are plain JSON/text.
- [ ] Reference list matches every `@` path mentioned in the body.

## Example (abbreviated)

User: filter fake bank from PSE selector.

Output shape:

````markdown
```text
Excluir banco placeholder del selector PSE Credibanco

Contexto:
...

Flujo actual:
1. @apps/next/src/components/checkout/Checkout/Checkout.tsx — ...
2. @packages/checkout/src/payment/CredibancoPSEProvider.ts — loadBanks / getExtraFields
...

Archivos de referencia:
@apps/next/src/components/checkout/Checkout/Checkout.tsx
@packages/checkout/src/payment/CredibancoPSEProvider.ts
```
````

## Anti-patterns

- Do not apply this skill for generic "improve my writing" without shareable format.
- Do not return the prompt as normal chat prose without the code fence.
- Do not use `@ path` (space after @) or full filesystem paths (`/Users/...`).
- Do not list reference files only in prose — always include the final section.
- Do not invent files; search the repo first.
- Do not nest code fences in the prompt body (` ```json `, ` ```ts `, etc.) — they break the single outer wrapper when pasted; use plain JSON/text instead.
- Do not use markdown headings, bold, links, or `- [ ]` task lists in the prompt body — plain text structure only.
