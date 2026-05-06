# Appendix E — Bibliography and Further Reading

The shortlist below collects the books, articles, and documentation
that most directly shaped this project. It is not a comprehensive
survey — it is the bookshelf an engineer onboarding to the project
would benefit from.

---

## Books

- **Robert C. Martin.** *Clean Architecture: A Craftsman's Guide to
  Software Structure and Design.* Prentice Hall, 2017. The canonical
  statement of the dependency rule that organizes the project.

- **Eric Evans.** *Domain-Driven Design: Tackling Complexity in the
  Heart of Software.* Addison-Wesley, 2003. The foundational text on
  aggregates, entities, value objects, and ubiquitous language. Long
  but worth a careful read.

- **Vaughn Vernon.** *Implementing Domain-Driven Design.* Addison-
  Wesley, 2013. The practical companion to Evans — readable, with
  modern .NET-flavored examples.

- **Vaughn Vernon.** *Domain-Driven Design Distilled.* Addison-
  Wesley, 2016. The 150-page summary if the longer books seem
  daunting.

- **Martin Fowler.** *Patterns of Enterprise Application
  Architecture.* Addison-Wesley, 2002. Older but still the best
  catalog of the patterns this project uses (Repository, Unit of
  Work, Service Layer, DTO, etc.).

- **Vladimir Khorikov.** *Unit Testing: Principles, Practices, and
  Patterns.* Manning, 2020. The best modern book on what makes a
  test valuable.

- **Roy Osherove.** *The Art of Unit Testing*, 3rd ed. Manning, 2024.
  The complementary practical text.

- **Jon Smith.** *Entity Framework Core in Action*, 2nd ed. Manning,
  2021. The deepest practical EF Core book in print; chapters 9
  (migrations) and 14 (bulk loading) directly inform Chapter 9 of
  this book.

- **Andrew Lock.** *ASP.NET Core in Action*, 3rd ed. Manning, 2023.
  The reference for ASP.NET Core idioms; especially good on
  configuration and middleware.

- **Khalid Abuhakmeh, Mike James, et al.** *.NET MAUI in Action.*
  Manning, 2023. Useful comparison reading for "how would this look
  on mobile?".

- **Steve Sanderson, Daniel Roth, Luke Latham.** *Blazor Revealed*
  series and the official Blazor docs. Chapter 11 leans heavily on
  these.

- **Kent C. Dodds.** *Epic React*, *Epic Web* (online courses). The
  most current treatment of modern React patterns; the project's
  React patterns trace back to these.

- **Betsy Beyer et al.** *Site Reliability Engineering: How Google
  Runs Production Systems.* O'Reilly, 2016. Chapters 4 (SLOs) and 6
  (golden signals) directly inform Chapter 15.

- **Charity Majors, Liz Fong-Jones, George Miranda.** *Observability
  Engineering.* O'Reilly, 2022. The modern argument for
  observability over monitoring.

- **Sam Newman.** *Building Microservices*, 2nd ed. O'Reilly, 2021.
  Useful as the *contrast* to this project — the right reference if
  the question becomes "should we split this?"

- **Donald Knuth.** *Literate Programming.* Stanford, 1992. The
  source of the discipline that informs the way code listings are
  introduced and discussed in this book.

---

## Articles and Papers

- **Robert C. Martin.** *"The Clean Architecture"* (blog post,
  2012). The original article. Free online.

- **Martin Fowler.** *"CQRS"* (article, 2011). The original
  description of Command/Query separation as an architectural
  pattern.

- **Vaughn Vernon.** *"Effective Aggregate Design,"* parts I, II,
  III (papers, 2011). The most rigorous treatment of why aggregates
  are sized the way they are.

- **Greg Young.** *"CQRS Documents"* (collection). The original
  CQRS thinking; harder reading than Fowler but more complete.

- **Andrew Lock.** *"Configuring options in ASP.NET Core"* (blog
  series). The definitive write-up on `IOptions<T>`.

- **Andrew Lock.** *"Versioning APIs in ASP.NET Core"* (blog post).

- **Andrew Lock.** *"Running async tasks on app startup in ASP.NET
  Core"* (blog post). The pattern used for the admin-user seed.

- **Simon Willison.** *Blog at simonwillison.net.* The most
  thoughtful working journalist on practical LLM use; many of the
  arguments in Chapter 14 echo positions Willison has refined over
  years.

- **David Crawshaw.** *"How I program with LLMs"* (essay, 2024). A
  careful first-person account of an experienced engineer's actual
  workflow with AI tools.

- **Andrej Karpathy.** *"Software 2.0"* (essay, 2017). The
  conceptual frame that anticipated current AI tooling.

- **Kent C. Dodds.** *"The Testing Trophy and Testing
  Classifications"* (blog post). The case for inverting the testing
  pyramid.

- **Martin Fowler.** *"Page Object"* (article). The original
  write-up on the pattern Chapter 13 uses.

- **Charity Majors.** *"Observability — A Manifesto"* (blog post).

---

## Specifications and Standards

- **IETF RFC 7519.** *JSON Web Token (JWT).* The authoritative spec.

- **IETF RFC 7807.** *Problem Details for HTTP APIs.* Referenced by
  exercise 7.H as the alternative to the project's response envelope.

- **IETF RFC 8259.** *JavaScript Object Notation (JSON).*

- **OpenAPI Initiative.** *OpenAPI Specification 3.1.0.*
  <https://spec.openapis.org/oas/v3.1.0>

- **W3C.** *Content Security Policy Level 3.* The CSP spec
  referenced in § 8.6.

---

## Documentation Sites

- **Microsoft Learn.** *.NET 10 documentation.*
  <https://learn.microsoft.com/dotnet/>

- **Microsoft Learn.** *EF Core documentation.*
  <https://learn.microsoft.com/ef/core/>

- **Microsoft Learn.** *ASP.NET Core documentation.*
  <https://learn.microsoft.com/aspnet/core/>

- **Microsoft Learn.** *Blazor documentation.*
  <https://learn.microsoft.com/aspnet/core/blazor/>

- **TanStack.** *TanStack Query docs.*
  <https://tanstack.com/query/latest>

- **Pmndrs.** *Zustand docs.* <https://zustand-demo.pmnd.rs/>

- **MudBlazor.** *Component documentation.* <https://mudblazor.com/>

- **Playwright.** *Playwright for .NET docs.*
  <https://playwright.dev/dotnet/>

- **Scalar.** *Scalar OpenAPI UI.* <https://scalar.com/>

- **bUnit.** *bUnit testing library.* <https://bunit.dev/>

- **Serilog.** *Serilog docs.* <https://serilog.net/>

- **Datalust.** *Seq log server.* <https://datalust.co/seq>

- **Testcontainers.** *Testcontainers for .NET.*
  <https://dotnet.testcontainers.org/>

- **OWASP.** *OWASP Cheat Sheet Series.*
  <https://cheatsheetseries.owasp.org/>
  Especially: Authentication, Cross-Site Scripting Prevention,
  Path Traversal, Cryptographic Storage.

- **The Twelve-Factor App.** <https://12factor.net/>
  The single best one-page summary of operational hygiene for
  modern applications.

- **AWS Well-Architected Framework.**
  <https://aws.amazon.com/architecture/well-architected/>

- **Azure Well-Architected Framework.**
  <https://learn.microsoft.com/azure/well-architected/>

---

## Tools

- **dotnet CLI.** The .NET command-line interface.
- **EF Core CLI** (`dotnet ef`). Migration management.
- **Pandoc.** The document converter that produces this book's DOCX,
  PDF, and EPUB.
- **MiKTeX** / **TeX Live.** Optional LaTeX distributions for PDF
  output.
- **WeasyPrint.** Optional CSS-based PDF engine.
- **Pylance.** The Python language server (used for the build
  scripts).

---

## A note on currency

Software documentation ages quickly. Versions cited throughout the
book — .NET 10, EF Core 10, React 19, Pandoc 3 — were current at the
time of writing. By the time you read this, at least one of them has
shipped a major version. Confirm against the official documentation
of the version you have installed before relying on a specific
behavior.
