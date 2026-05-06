# Chapter 1 — Introduction

> *"The best way to learn software architecture is to build something real."*

---

## What you will learn

- What the EBook Library application does, and why it is a useful learning
  vehicle.
- The technology stack used in the book, and the one or two sentences of
  justification for each choice.
- A first, deliberately incomplete mental picture of the layered
  architecture you will spend the rest of the book filling in.
- How to verify your development environment is ready for Chapter 2.

This chapter introduces vocabulary that recurs in every later chapter.
You will not write any code; you will set up the workshop.

---

## 1.1 What you are building

The **EBook Library** is a web application for browsing, searching, and
downloading Spanish-language eBooks in ePub format. It is small enough to
explain in a single book and large enough to exercise every layer of a
modern web stack.

A useful one-paragraph product description: *anonymous visitors browse
and search a catalog of more than fifty thousand books; authenticated
users can download ePub files; administrators manage the catalog of
books, authors, genres, and users.*

The full feature surface is intentionally modest. It is summarized in
Table 1.1, which also serves as a working list of the API endpoints you
will implement in Part II.

**Table 1.1 — Feature inventory by audience.**

| Feature                                | Anonymous | Authenticated | Admin |
|----------------------------------------|:---------:|:-------------:|:-----:|
| Browse and filter by title, author, or genre | ✓ | ✓ | ✓ |
| Full-text search across the catalog    | ✓ | ✓ | ✓ |
| View book details (cover, metadata)    | ✓ | ✓ | ✓ |
| Register and log in                    | ✓ | — | — |
| Download ePub files                    | — | ✓ | ✓ |
| View personal download history         | — | ✓ | ✓ |
| Create, edit, and delete books         | — | — | ✓ |
| Upload ePub files                      | — | — | ✓ |
| Manage authors and genres              | — | — | ✓ |
| Manage user accounts                   | — | — | ✓ |

What makes the project unusually instructive is its second half: **two
complete frontends**, in two different ecosystems, calling the same API.

The primary frontend is a React 18 + TypeScript single-page application
styled after Barnes & Noble's storefront. The alternate frontend is a
Blazor WebAssembly application written entirely in C#. Both frontends
implement the full feature inventory in Table 1.1 against an identical
backend, which makes the project a controlled experiment in
"same-problem, different-tool" comparison. Chapters 10 and 11 walk each
frontend in turn.

> **Foundations:** A *single-page application* (SPA) is a web application
> that loads a single HTML document on first request and then updates the
> page in place via JavaScript or WebAssembly, instead of fetching a new
> HTML page from the server for every navigation. The user perceives the
> application as a desktop-like experience; the server provides only data
> (usually JSON), not pre-rendered HTML.

---

## 1.2 Why this project, and not something smaller

A common pedagogical approach is to start with a to-do list application.
This works for a chapter or two; it stops being useful as soon as the
reader needs to confront *real* engineering decisions. The to-do app
never needs to seed fifty thousand records, never has a meaningful
many-to-many relationship, and never makes you choose between session
cookies and JWT.

The EBook Library project is calibrated to surface those decisions
without becoming so large that the book is mostly inventory. It deals
with:

- **Authentication and authorization.** Stateless JWT tokens, two roles
  (regular user, admin), and the small but consequential decisions about
  token lifetime, storage, and refresh that come with them.
- **A non-trivial domain.** Books have many-to-many relationships with
  *both* authors and genres. Downloads are a many-to-many relationship
  between users and books with a timestamp payload. None of these
  fit a single-entity CRUD pattern.
- **Realistic data scale.** The seed corpus is 51,599 books across 128
  genres, parsed from real HTML exports. Search has to work, paging has
  to work, and queries have to be considered.
- **Two UI paradigms.** React (functional components, hooks, JSX) and
  Blazor (Razor components, C# code-behind, WebAssembly).
- **A test pyramid.** Unit tests of pure handlers, integration tests of
  controllers via `WebApplicationFactory`, and end-to-end browser tests
  via Playwright that drive both frontends.

> **In Practice:** Most production engineering decisions are decided not
> by the *first* requirement that touches a layer but by the *third*.
> When designing the catalog page, the requirement for a search field is
> trivial; the requirement to also filter by genre is uncomfortable; the
> requirement to also paginate the result is what forces the API shape.
> A learning project is only useful to the extent that it lets you
> experience that compounding pressure.

---

## 1.3 The technology stack, and one sentence each

Every choice in the stack is defended in detail in the chapter where it
is first introduced. This section gives one sentence per technology so
you have a complete inventory before reading further. Treat it as a
reference, not a tutorial.

**.NET 10 / ASP.NET Core 10.** Microsoft's open-source, cross-platform
framework for web APIs and applications; chosen for performance, mature
tooling, and first-class support for the patterns this book teaches.

**Clean Architecture.** A layered organization in which business rules
sit at the center and frameworks sit at the edges, with all dependencies
pointing inward; chosen because it makes business logic testable
without a database and swappable across infrastructure choices.

**CQRS via MediatR.** Command Query Responsibility Segregation, in which
write operations and read operations are dispatched to separate handler
classes through a mediator; chosen because each handler has a single
responsibility and is trivial to unit test.

**Entity Framework Core 10.** Microsoft's object-relational mapper;
chosen because it provides version-controlled migrations, LINQ-to-SQL
translation, and change tracking with minimal ceremony.

**SQL Server 2022.** Relational database; chosen for the project's
default but isolated behind repository interfaces so it can be replaced
with PostgreSQL or another provider by editing one line.

**JWT (JSON Web Tokens).** A stateless authentication mechanism in
which the server signs a token after login and validates it on every
subsequent request without server-side session storage; chosen because
it is the standard for SPA-API auth.

**React 18 + TypeScript** (with Vite, Tailwind CSS, Zustand, React
Query, and i18next). The primary frontend stack; chosen as the present
default for new SPA projects in the JavaScript ecosystem.

**Blazor WebAssembly + .NET 10.** The alternate frontend stack; chosen
to demonstrate that the same architecture and API can be consumed from a
completely different ecosystem.

**xUnit, Moq, FluentAssertions, Playwright.** The testing stack;
chosen for unit tests, mocking, readable assertions, and browser
automation respectively.

**Scalar (OpenAPI 3.1).** API documentation viewer; chosen as a more
modern replacement for Swagger UI.

> **Architect's Note:** Every choice in this stack has at least one
> reasonable alternative. ASP.NET Core could have been Java + Spring
> Boot or Go + Echo. CQRS could have been a thicker service layer with
> no mediator. EF Core could have been Dapper. The point of naming
> alternatives in this book is not to be evenhanded for its own sake;
> it is to remind you that the *next* greenfield project you start at
> work will face the same menu, and the right answer is rarely "what we
> used last time".

---

## 1.4 A first picture of the architecture

Before you write any code, fix a mental picture of where things live and
how they talk. The picture in Figure 1.1 is a deliberate
oversimplification — Chapter 2 will redraw it in greater detail and
Chapter 7 will redraw it again from the API's point of view — but the
top-level shape will not change.

![Figure 1.1 — High-level container diagram of the EBook Library system.](figures/02-c4-container.jpg)

Three observations to carry into Chapter 2:

1. The **API** is the single entry point to all business behavior. Both
   frontends speak to it over HTTP with JSON, and both rely on it for
   authentication.
2. The backend is **layered internally**. Controllers in the Web API
   forward work to the Application layer; Application orchestrates
   business behavior through the Domain layer; Infrastructure provides
   the implementations that bridge the abstract Domain and the concrete
   database and file system.
3. The dependency arrows in Figure 1.1 only point one way per pair.
   This is the *dependency rule*, the most important rule in the book.
   It is so important that all of § 2.2 is dedicated to it.

---

## 1.5 The data: 51,599 real books

The catalog you will seed in Chapter 9 is not a synthetic dataset. It
comes from three HTML export files (`lista_autor.html`,
`lista_generos.html`, `lista_titulo.html`) carrying metadata for 51,599
Spanish-language books across 128 genres. A small console application
(`EBookLibrary.Seeder`) parses these files and bulk-inserts the
records into SQL Server.

This decision matters more than it looks. Real data behaves differently
from random data: queries return interesting results, search exposes
tokenization edge cases, and the UI looks like a real bookstore rather
than a placeholder. The first time you scroll through the React
catalog and see real titles by Cervantes, García Márquez, and Borges,
the application stops feeling like a tutorial.

> **Pitfall:** It is tempting, when seeding a development database, to
> generate random strings ("Book 1", "Book 2", …). This works for unit
> tests but is actively misleading during manual testing. Random data
> does not stress the layout, does not test sort orders, does not
> exercise filter facets, and gives you false confidence that the UI is
> "done" when in fact it has never been tried with realistic content.

---

## 1.6 Manual versus AI-assisted construction

The repository accompanying this book contains *two* implementations of
the same project, side by side:

- `Manual/` — written by hand, file by file.
- `Automatic/` — scaffolded with GitHub Copilot using structured prompt
  documents.

Both are complete enough to run. Chapter 14 returns to this experiment
in detail, comparing what AI assistance accelerated, what it generated
incorrectly, and where human judgment was irreplaceable. The 🤖 symbol in
later chapters marks short notes connecting the chapter material to that
larger comparison.

> **Architect's Note:** The reason both implementations are kept in the
> repository is not to argue that one is "better". It is to make the
> *delta* visible. A book describing only the AI-generated version
> would conceal the corrections that were made to it. A book describing
> only the manual version would conceal the speedup. The interesting
> data is the difference, and you can read both versions of any file at
> any time.

---

## 1.7 Setting up the development environment

The remainder of this chapter prepares your laptop. Chapter 2 begins
with `dotnet new sln`; everything below must be in place first.

### Prerequisites

| Tool                 | Required version | Where                                                |
|----------------------|------------------|------------------------------------------------------|
| .NET SDK             | 10.0+            | <https://dotnet.microsoft.com/download/dotnet/10.0>  |
| Node.js              | 20 LTS or newer  | <https://nodejs.org>                                 |
| SQL Server           | 2022 Developer   | <https://www.microsoft.com/sql-server/sql-server-downloads> |
| Visual Studio Code   | latest           | <https://code.visualstudio.com>                      |
| Git                  | any recent       | <https://git-scm.com>                                |

**Listing 1.1 — Verifying your installations.**

```powershell
dotnet --version            # → 10.x.x
node --version              # → v20.x.x or higher
npm --version               # → 10.x.x or higher
git --version               # any recent version
Get-Service -Name "MSSQLSERVER" | Select-Object Status   # → Running
```

### EF Core CLI tool

The EF Core command-line tool (`dotnet ef`) is installed once globally
and used for migrations from Chapter 9 onward.

**Listing 1.2 — Installing the EF Core CLI.**

```powershell
dotnet tool install --global dotnet-ef
dotnet ef --version          # → 10.x.x
```

### VS Code extensions

The book assumes Visual Studio Code as the primary editor. The
following extensions cover the entire stack.

**Listing 1.3 — One-line install of the recommended VS Code extensions.**

```powershell
code --install-extension ms-dotnettools.csdevkit
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension humao.rest-client
code --install-extension bierner.markdown-mermaid
```

> **In Practice:** Engineering teams that share an editor configuration
> commit a `.vscode/extensions.json` file to the repository so that VS
> Code prompts new contributors to install the same extensions on first
> open. The reference implementation in this book follows that practice.

---

## 1.8 Checkpoint

You are ready for Chapter 2 when you can answer "yes" to all of the
following:

- [ ] You can describe what the application does in one sentence without
      consulting the book.
- [ ] You can name the four layers of the backend (Web API, Application,
      Domain, Infrastructure) and the direction of dependencies between
      them.
- [ ] You have run all five commands in Listing 1.1 and seen the
      expected output.
- [ ] `dotnet ef --version` reports 10.x.x.
- [ ] At least one of the two frontends (React or Blazor) is one you
      have heard of and can write a "hello world" in.

---

## Key takeaways

- The EBook Library is a deliberately small but realistic project that
  surfaces the engineering decisions a to-do app cannot.
- The technology stack is conventional for a 2026-era greenfield
  .NET project; every choice has at least one reasonable alternative.
- Two complete frontends consume the same API, which makes the project
  a controlled comparison study.
- The seed dataset is real, not synthetic; this matters more than it
  appears.
- A *manual* and an *AI-assisted* implementation coexist in the
  repository; Chapter 14 returns to that comparison.

---

## Exercises

**Easy.** Open the folder `Automatic/EBookLibrary/` in the accompanying
repository and list the projects under `src/` and `tests/`. Predict, for
each project, which other projects it should reference. You will check
your answer at the end of Chapter 2.

**Medium.** From the feature inventory in Table 1.1, draw a one-page
sketch of the screens you would build in a frontend to expose all of
them. Decide which features belong to public pages, authenticated pages,
and admin pages. (Compare your sketch with Chapter 10 when you reach it.)

**Hard.** Pick one technology choice in § 1.3 — JWT, EF Core, MediatR,
React, or Blazor — and write a one-page memo arguing for the strongest
reasonable alternative. The exercise is not to *adopt* the alternative
but to articulate it convincingly. This exercise is the entry-level
version of the design memos that Architecture Decision Records (Appendix
C) exist to capture.

---

## Further reading

- Robert C. Martin, *Clean Architecture: A Craftsman's Guide to Software
  Structure and Design.* The book that named the pattern this project
  uses.
- Simon Brown, *The C4 Model for Visualising Software Architecture.*
  The diagramming notation used in Chapter 2 and reused throughout the
  book. Free online at <https://c4model.com>.
- Microsoft, *.NET Application Architecture Guides.*
  <https://docs.microsoft.com/dotnet/architecture/>
- Adam Wathan, *Refactoring UI.* A practical companion when you reach
  the React frontend in Chapter 10.
