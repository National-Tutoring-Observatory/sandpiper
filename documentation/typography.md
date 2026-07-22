---
title: "Typography"
tags: ["design-system", "typography"]
category: "Design System"
isPublished: true
---

# Typography

## Overview

Sandpiper uses a semantic type scale defined as Tailwind v4 `@utility` classes in
`app/app.css`. Each class sets font-size and line-height so a component references
a role instead of picking a raw size. Weight and color are deliberately kept out
of these classes — apply a `font-*` weight utility and a color utility
(`text-muted-foreground`, `text-sandpiper-accent`, etc.) alongside the type class.
Keeping weight orthogonal avoids order-dependent conflicts between the custom
`@utility` classes and adjacent core `font-*` utilities.

## The scale

The "Typical weight" column is a suggestion, not baked in — pick the `font-*` that
fits the context (base components like `CardTitle` already supply their own).

| Class          | Size     | Typical weight  | Line-height | Use for                                        |
| -------------- | -------- | --------------- | ----------- | ---------------------------------------------- |
| `text-display` | 1.5rem   | `font-bold`     | 1.2         | Hero numbers and big stats.                    |
| `text-title`   | 1.25rem  | `font-semibold` | 1.3         | Page and panel titles.                         |
| `text-heading` | 1rem     | `font-semibold` | 1.4         | Section headings.                              |
| `text-body`    | 0.875rem | `font-normal`   | 1.5         | Default body and UI text — the workhorse.      |
| `text-body-lg` | 1rem     | `font-normal`   | 1.55        | Reading content, such as chat message bubbles. |
| `text-caption` | 0.75rem  | `font-normal`   | 1.4         | Meta, captions, and muted small text.          |

## Rules

- A component uses one semantic type class for size, paired with an explicit
  `font-*` weight (unless the element inherits the intended weight from a base
  component) and an optional color utility.
- Do not use raw `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, or
  `text-2xl` for new or refactored code — use a role for size.
- Use the role for size and a `font-*` utility for weight. Do not expect a role
  to set weight for you.

## Example

Before:

```tsx
<div className="text-muted-foreground mb-1 text-xs">Total utterances</div>
<div className="text-2xl font-bold">{utteranceCount}</div>
```

After:

```tsx
<div className="text-muted-foreground text-caption mb-1">Total utterances</div>
<div className="text-display font-bold">{utteranceCount}</div>
```
