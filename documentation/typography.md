---
title: "Typography"
tags: ["design-system", "typography"]
category: "Design System"
isPublished: true
---

# Typography

## Overview

Sandpiper uses a semantic type scale defined as Tailwind v4 `@utility` classes in
`app/app.css`. Each class bundles font-size, font-weight, and line-height so a
component references a role instead of picking a raw size. Color is not part of
these classes — apply a color utility (`text-muted-foreground`,
`text-sandpiper-accent`, etc.) alongside the type class.

## The scale

| Class          | Size     | Weight | Line-height | Use for                                        |
| -------------- | -------- | ------ | ----------- | ---------------------------------------------- |
| `text-display` | 1.5rem   | 700    | 1.2         | Hero numbers and big stats.                    |
| `text-title`   | 1.25rem  | 600    | 1.3         | Page and panel titles.                         |
| `text-heading` | 1rem     | 600    | 1.4         | Section headings.                              |
| `text-body`    | 0.875rem | 400    | 1.5         | Default body and UI text — the workhorse.      |
| `text-body-lg` | 1rem     | 400    | 1.55        | Reading content, such as chat message bubbles. |
| `text-caption` | 0.75rem  | 400    | 1.4         | Meta, captions, and muted small text.          |

## Rules

- A component uses one semantic type class, optionally paired with a color
  utility. Nothing else sets size or weight.
- Do not use raw `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`,
  `text-2xl`, or standalone `font-bold`/`font-semibold` for new or refactored
  code. The role class already supplies size and weight.
- If a heavier weight than the role provides is genuinely needed, add a `font-*`
  utility, but prefer letting the role define weight.

## Example

Before:

```tsx
<div className="text-muted-foreground mb-1 text-xs">Total utterances</div>
<div className="text-2xl font-bold">{utteranceCount}</div>
```

After:

```tsx
<div className="text-muted-foreground text-caption mb-1">Total utterances</div>
<div className="text-display">{utteranceCount}</div>
```
