---
applyTo: "Training/book/**"
---

# Training book

The 30-chapter book that documents the EBook Library design. Built with
Pandoc into `.docx` and `.epub`.

## Layout

```
Training/book/
  manuscript/        ← 30 numbered chapter MD files (00-introduction.md ... 29-...)
  assets/
    callouts.lua     ← Pandoc filter for note/tip/warning blocks
    reference.docx   ← Style template for DOCX output
    images/          ← Diagrams, screenshots
  build-book.js      ← Node build script (calls pandoc)
  dist/              ← Output (.docx, .epub) — git-ignored
  tmp/               ← Pandoc working files — git-ignored
  package.json
```

## Conventions

- One chapter per file, prefixed with a two-digit number for ordering.
- Front-matter is plain Markdown headers; no YAML.
- H1 (`#`) is the chapter title — exactly one per file.
- Code fences specify a language tag (`csharp`, `tsx`, `powershell`, ...).
- Cross-chapter references use the chapter number and title:
  *"see Chapter 7 — Authentication"*. Avoid raw file paths in prose.
- Callouts use the custom `:::note`, `:::tip`, `:::warning` blocks handled by
  `assets/callouts.lua`. Keep them short — one paragraph.

## Building

```powershell
cd Training/book
npm install
node build-book.js          # produces dist/EBookLibrary-Training-Guide-v2.{docx,epub}
```

Pandoc must be on `PATH`. The build script reads chapter order from
`manuscript/` (lexicographic) and concatenates via Pandoc.

## Editing rules

- Don't renumber chapters once published — insert with a `b` suffix
  (`07b-...`) if absolutely necessary, then rename in the next major rev.
- Keep code samples short and **buildable** — they are extracted by readers.
  Pull from the actual `Automatic/EBookLibrary/` source where possible.
- Diagrams: edit the `.drawio` source under `docs/architecture/diagrams/`,
  re-export the PNG/JPEG into `Training/book/assets/images/`, then reference
  by relative path.
- Never embed secrets or real connection strings in samples.

## Don't

- Don't regenerate `dist/` for every doc tweak — only when shipping a new
  edition.
- Don't edit `dist/` files directly; they are output only.
