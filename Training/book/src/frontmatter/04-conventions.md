# Conventions Used in This Book

This short chapter is a reference for the visual signals used throughout
the book. Skim it now and refer back when something looks unusual.

## Type system

| Element                   | Typeface, size           | Why                                   |
|---------------------------|--------------------------|---------------------------------------|
| Running text              | Cambria 11 pt            | Calm, readable serif for long reads   |
| Chapter and section heads | Calibri (sans), navy     | Clear visual hierarchy                |
| `inline code`             | Consolas, burgundy       | Distinguishes identifiers from prose  |
| Code listings             | Consolas 9 pt, gray bg   | High density, easy to scan            |
| File and path references  | `like/this`              | Code style, no extra labeling         |

## Sidebar callouts

Four sidebar styles are used throughout the book to layer information for
different readers without breaking the main narrative.

> **Foundations:** Background that a textbook would normally assume you
> already had. Skip this if you are comfortable with the topic; read it
> if a term went past you a paragraph ago.

> **Architect's Note:** Trade-offs, alternatives that were considered
> and rejected, and the conditions under which a different decision would
> be correct. Useful for senior engineers and architects.

> **Pitfall:** A specific mistake that is easy to make and the reason
> the mistake is harmful. Read these — most of them are paid for in
> someone else's outage.

> **In Practice:** How real engineering teams actually apply the pattern,
> versus the textbook description. Often the most useful sidebar in the
> book.

In addition, two legacy callouts are carried forward from the original
training guide:

> **Tip:** A non-obvious shortcut.

> **Warning:** A risk you should be aware of before continuing.

## Numbered figures, tables, and listings

Every figure, table, and code listing is numbered by chapter and ordinal:

- *Figure 4.2* — the second figure in Chapter 4
- *Table 7.1* — the first table in Chapter 7
- *Listing 5.3* — the third code listing in Chapter 5

Cross-references in the text use the same form: "as shown in Listing 5.3,
the handler delegates the work to the repository". A consolidated **List
of Figures**, **List of Tables**, and **List of Listings** follows the
table of contents.

## Code listings

Code is shown in a fixed-width font on a tinted background. Long lines are
wrapped where it is safe to do so; where wrapping would change meaning the
listing is reformatted to fit the page. Output that the program prints to
the console is shown in the same style and labeled in the surrounding
prose.

When a listing contains *only the changed lines* of an existing file, the
caption explicitly says so ("…changes to `Program.cs`"). Otherwise the
listing is the complete contents of the file at that point in the chapter.

## File paths

File paths use forward slashes regardless of operating system, except in
PowerShell command listings where the host conventions are honored. Paths
rooted at the project repository are shown without a leading slash:

```
src/EBookLibrary.Domain/Entities/Book.cs
```

## Cross-references and the Glossary

Italicized terms on first use (*aggregate root*, *value object*) appear in
the **Glossary** at the back of the book. Cross-references between chapters
use the form "(see § 7.3)" for sections and "(Chapter 11)" for whole
chapters. Page references are not used because page numbers shift between
print and ebook formats.

## A note on the code in this book

Every code listing in this book corresponds to a real file in the
accompanying repository. Where the book shows a fragment, the file path
is named in the caption so you can read the full version in context. The
code as printed is *complete enough to make the point* but not always
*executable in isolation* — the surrounding files in the repository are
part of the lesson.
