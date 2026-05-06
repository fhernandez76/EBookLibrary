# EBook Library — Full-Stack Training Guide

> **Learning by Building: A Complete .NET 10 + React + Blazor Application**

This training guide teaches you how to build a production-quality full-stack web application from scratch, using the **EBook Library** project as a real-world example. Every architectural decision is explained, every pattern is justified, and every implementation is shown step by step.

---

## What You Will Build

A fully functional digital library platform where users can:
- Browse and search **51,599+ Spanish-language eBooks** across 128 genres
- Register, log in, and download ePub files
- Manage the catalog as an admin (books, authors, genres, users)

Two alternative frontends demonstrate the same features in different technology stacks:
- **React 18 + TypeScript** — the primary SPA (Barnes & Noble-inspired UI)
- **Blazor WebAssembly** — the alternative C# browser app

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Backend API | ASP.NET Core 10 · C# 14 · .NET 10 |
| Architecture | Clean Architecture + CQRS |
| ORM | Entity Framework Core 10 |
| Database | MS SQL Server 2022 |
| Auth | JWT Bearer · BCrypt |
| Mediator / CQRS | MediatR 12 |
| Validation | FluentValidation |
| Mapping | AutoMapper |
| React Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Query |
| Blazor Frontend | Blazor WebAssembly · .NET 10 · Bootstrap 5 |
| Testing | xUnit · Moq · FluentAssertions · Playwright |
| API Docs | Scalar (OpenAPI 3.1) |

---

## How to Read This Guide

### Prerequisites

Before starting, ensure the following tools are installed:

| Tool | Version | Download |
|---|---|---|
| .NET SDK | 10.0+ | https://dotnet.microsoft.com/download |
| Node.js | 20 LTS+ | https://nodejs.org |
| SQL Server | 2022 Developer | https://www.microsoft.com/sql-server/sql-server-downloads |
| VS Code (recommended) | Latest | https://code.visualstudio.com |
| Git | Latest | https://git-scm.com |

**VS Code Extensions recommended:**
- C# Dev Kit
- Prettier (code formatter)
- Tailwind CSS IntelliSense
- REST Client (for `.http` files)
- Mermaid Preview

---

## Reading Paths

This guide supports two learning paths depending on which frontend you want to build:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ALL READERS: Chapters 00–08 (Foundation + Full Backend)             │
│  00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08                       │
└──────────────────────┬───────────────────────────────┬──────────────┘
                       │                               │
              ┌────────▼──────────┐         ┌─────────▼────────────┐
              │  PATH A: React    │         │  PATH B: Blazor      │
              │  Chapter 09       │         │  Chapter 10          │
              └────────┬──────────┘         └─────────┬────────────┘
                       │                               │
              ┌────────▼───────────────────────────────▼────────────┐
              │ ALL READERS: Testing + Extras (Chapters 11–14 +      │
              │ Appendices)                                           │
              └─────────────────────────────────────────────────────┘
```

---

## Table of Contents

| # | Chapter | Topics | Est. Time |
|---|---------|--------|-----------|
| [00](00-INTRODUCTION.md) | Introduction | Project overview, goals, architecture preview | 30 min |
| [01](01-ARCHITECTURE-DEEP-DIVE.md) | Architecture Deep Dive | Clean Architecture, CQRS, C4 diagrams, design decisions | 1 hr |
| [02](02-SOLUTION-SETUP.md) | Solution Setup | .NET CLI, project scaffolding, references, NuGet packages | 45 min |
| [03](03-DOMAIN-LAYER.md) | Domain Layer | DDD entities, value objects, repository interfaces | 1 hr |
| [04](04-APPLICATION-LAYER.md) | Application Layer | CQRS, MediatR, FluentValidation, AutoMapper | 2 hr |
| [05](05-INFRASTRUCTURE-LAYER.md) | Infrastructure Layer | EF Core, repositories, JWT, BCrypt, file storage | 2 hr |
| [06](06-WEBAPI-LAYER.md) | Web API Layer | Controllers, middleware, response pattern, OpenAPI | 1.5 hr |
| [07](07-AUTHENTICATION.md) | Authentication | JWT deep dive, roles, security hardening | 1 hr |
| [08](08-DATABASE-MIGRATIONS.md) | Database & Migrations | EF Core migrations, seeding 51K books | 1 hr |
| [09](09-REACT-FRONTEND.md) | React Frontend | Vite, Tailwind, Zustand, React Query, i18next | 3 hr |
| [10](10-BLAZOR-FRONTEND.md) | Blazor Frontend | WASM, auth state, localization, components | 3 hr |
| [11](11-UNIT-TESTS.md) | Unit Tests | xUnit, Moq, FluentAssertions, integration tests | 2 hr |
| [12](12-E2E-TESTS.md) | End-to-End Tests | Playwright, multi-server orchestration, flow tests | 1.5 hr |
| [13](13-COPILOT-COMPARISON.md) | AI-Assisted Dev | Manual vs. Copilot: what to delegate, what to own | 45 min |
| [14](14-DEPLOYMENT-CHECKLIST.md) | Deployment Checklist | Environment config, debugging, troubleshooting | 30 min |
| [A](APPENDIX-A-API-REFERENCE.md) | API Reference | All endpoints, request/response schemas | Reference |
| [B](APPENDIX-B-EXERCISES.md) | Exercises | Hands-on challenges per chapter (Easy/Medium/Hard) | Self-paced |

---

## How to Generate the DOCX Version

A Node.js script is included to combine all chapters into a single Word document:

```bash
# From the Training/ folder
node generate-training-docx.js
# Output: Training/EBookLibrary-Training-Guide.docx
```

> **Requirements:** [Pandoc](https://pandoc.org/installing.html) must be installed and available on your PATH.

---

## Notes on Code Style

Throughout this guide:
- **Full code blocks** are shown for complex, non-obvious implementations (auth handlers, EF configurations, JWT service)
- **High-level descriptions** are used for boilerplate and repetitive patterns
- Each chapter ends with a **Checkpoint** — the state your solution should be in before proceeding
- The 🤖 icon marks sections discussing AI-assisted development

---

## Source Code

The complete reference implementation is at:
```
Automatic/EBookLibrary/   ← AI-assisted implementation (complete)
Manual/                   ← Manual implementation (in progress)
```

---

*Estimated total reading + coding time: **18–24 hours** (full path, both frontends)*
*Experienced developers comfortable with .NET: **10–14 hours***
