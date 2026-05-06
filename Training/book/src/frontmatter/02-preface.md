# Preface

> *"The best way to learn architecture is to build something real,
> then explain it to someone else."*

This book grew out of a working software project. The **EBook Library** is a
production-quality digital library platform — backend, two frontends, more
than fifty thousand seeded records, end-to-end tests, the works. It was
originally built as a learning artifact, accompanied by a step-by-step
training guide written in Markdown.

The training guide answered the question *"how do I build this?"* very well.
But as several engineers picked it up, a different question kept surfacing:
*"why is it built this way?"* That question — the *why* behind the *how* —
is what books are good at.

This Book Edition is the answer. It takes the same project, the same code,
and the same chapters, and re-frames them as a unified narrative arc that
moves from foundations to implementation to long-running concerns. It adds
the explanatory layer that a working repository can never carry on its own:
the trade-offs that were considered and discarded, the alternatives that
would also have worked, the pitfalls that nearly derailed the build, and the
patterns that real teams reach for when the demo is over and production
begins.

## Who this book is for

This book is written for working engineers across three career stages.

**Junior engineers** who can already write code in one or two languages but
have not yet built a complete production-style stack will find that every
new concept is introduced with a sidebar marked **Foundations** giving
the background a textbook would assume you already had.

**Mid-level engineers** comfortable with .NET or React will find the
architectural decisions explained at the level a senior reviewer would ask
about in a pull request — including the alternatives that were considered
and rejected.

**Lead and staff engineers** will find sidebars marked **Architect's Note**
that surface the trade-offs, anti-patterns, and "when *not* to use this"
considerations that are easy to leave implicit in a tutorial. The
Architecture Decision Records in Appendix C distill the most consequential
of these choices into a form your team can fork.

## What this book is not

This is not a reference manual for ASP.NET Core, React, or any of the
libraries used. Each is documented exhaustively elsewhere. The book points
to those references and uses each tool to illustrate a more general
engineering idea — Clean Architecture, CQRS, the dependency rule, the cost
of premature abstraction.

It is also not an *opinion* book. Where a decision could reasonably have
gone the other way, the alternative is named, the trade-off is described,
and the reader is trusted to disagree.

## How to read this book

The book is organized in three parts.

**Part I — Foundations** (Chapters 1–3) gives you the project, the
architectural model, and a working solution skeleton. Read it in order.

**Part II — Implementation** (Chapters 4–11) walks the layers of the
running application from Domain outward to the React and Blazor frontends.
Each chapter ends in a verifiable checkpoint, and chapters depend on the
ones before them.

**Part III — Architecture & Scale** (Chapters 12–15) covers the practices
that turn a working application into a maintained one: tests at three
levels, AI-assisted development, and a deployment checklist. These
chapters can be read out of order.

The back matter contains a full API reference, exercises by chapter and
difficulty, an Architecture Decision Records appendix, a glossary, and a
bibliography.

## Conventions

A short tour of the visual conventions used throughout the book follows in
the next chapter, *Conventions Used in This Book*.

## Acknowledgments

A separate acknowledgments page closes the front matter. The short version:
this book exists because of the engineers who reviewed early drafts of the
training guide, the AI assistants that were both subject and tool, and a
year of evening hours.
