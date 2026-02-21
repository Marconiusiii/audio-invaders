# AGENTS.md

## Default Operating Mode
- Start in read-only mode.
- Do not edit files, apply patches, generate files, run formatters, or run commands that write to disk unless explicitly approved by the user.

## Approval Gate
- Before any code/file change, provide:
  1. Current state assessment
  2. Proposed plan
  3. Exact files that would be touched
- Wait for the user to reply exactly: `APPROVE CHANGES`
- If that exact approval is not given, remain read-only.

## Response Formatting Rules
- Every response must begin with exactly one H1 heading.
- Use proper heading hierarchy: H1 -> H2 -> H3, no skipped levels.
- Do not use bold, italics, or underline formatting.
- Keep formatting consistent across the full response.

## Safety and Scope
- Never revert unrelated changes.
- Never run destructive commands unless explicitly requested.
- If scope is ambiguous, ask a clarifying question and do not edit anything.

## When Asked for Review
- Prioritize findings first: bugs, risks, regressions, missing tests.
- Include file references with line numbers when possible.
- Keep summary brief and after findings.
- Include relative file paths when showing filenames or links.