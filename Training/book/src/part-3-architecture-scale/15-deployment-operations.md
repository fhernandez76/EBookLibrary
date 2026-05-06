# Chapter 15 — Deployment and Operations

> *"It runs on my machine — congratulations, we'll ship your
> machine."*

---

## What you will learn

- The minimum a .NET 10 Web API needs to be considered
  production-ready: configuration, secrets, health checks, structured
  logging, observability.
- How to package the API and the SPAs as Docker images and what to
  put in each.
- The deployment story this project recommends — a containerized API
  behind a reverse proxy, with the SPAs served as static assets — and
  three alternatives at different cost and complexity points.
- How to manage secrets in development (user-secrets), staging
  (environment variables), and production (Key Vault / Secrets
  Manager).
- The scaling envelope: when a single instance is enough, when to add
  replicas, when to add a cache, and when to shard.
- The on-call runbook: the five alerts you should have, the three you
  should not.

---

## 15.1 The pre-flight checklist

A web API that is "running" is not the same as one that is
"production-ready". Before the first paying user touches the system,
work through Table 15.1.

**Table 15.1 — Pre-production readiness checklist.**

| #  | Item                                                            | Where covered      |
|----|-----------------------------------------------------------------|--------------------|
| 1  | All secrets out of source control                               | § 15.5             |
| 2  | HTTPS only; HTTP redirects to HTTPS                             | § 15.4             |
| 3  | CORS allows only the specific origins, with credentials         | § 7.6              |
| 4  | Authentication required by default; opt-out is explicit         | § 8.5              |
| 5  | Health endpoint that distinguishes liveness from readiness      | § 15.3             |
| 6  | Structured logging with correlation ids                          | § 15.6             |
| 7  | Request rate limiting on `/login` and `/register`               | § 8.7              |
| 8  | Database migrations applied via reviewed SQL, not the runtime    | § 9.3              |
| 9  | Admin default credentials changed (refuse to start otherwise)    | § 9.6              |
| 10 | Sensitive responses do not echo internal exception messages     | § 7.4              |
| 11 | Long-running endpoints respect `CancellationToken`              | Throughout         |
| 12 | Backups configured and *tested by restoring*                    | § 15.8             |
| 13 | Monitored, not just instrumented                                | § 15.7             |
| 14 | Runbook exists for the top five alerts                           | § 15.9             |
| 15 | Disaster-recovery RTO/RPO documented and met by the architecture | § 15.8             |

The checklist is not exhaustive. It is the floor.

---

## 15.2 Configuration: layers and overrides

ASP.NET Core's configuration is layered. Each layer overrides the one
below it. The project uses, in increasing precedence:

1. `appsettings.json` — non-secret defaults committed to source.
2. `appsettings.{Environment}.json` — non-secret per-environment
   defaults (`Development`, `Staging`, `Production`).
3. **User secrets** in development (per-developer, not in repo).
4. **Environment variables** in staging and production.
5. **Command-line arguments** (override anything for a one-off run).

That stack means the same code reads `Configuration["ConnectionStrings:Default"]`
in every environment; what *provides* the value differs by deployment
target.

```csharp
var builder = WebApplication.CreateBuilder(args);
// The above already wires JSON files, env vars, user-secrets in Development,
// and command-line args. No additional configuration code needed.
```

---

## 15.3 Health checks — liveness vs readiness

The kubelet (in Kubernetes) and equivalent orchestrators ask two
different questions:

- **Liveness:** is the process alive? (If no, restart it.)
- **Readiness:** is the process ready to *serve*? (If no, take it out
  of the load-balancer rotation, but do not restart it.)

The two answers are different. A process that is mid-startup, waiting
for the database connection pool to warm up, is *alive but not
ready*. Restarting it would be wrong; routing traffic to it would
also be wrong.

**Listing 15.1 — `Program.cs` (health checks).**

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database",
        failureStatus: HealthStatus.Degraded);

// after build:
app.MapHealthChecks("/health/live",  new HealthCheckOptions
{
    Predicate = _ => false,             // no individual checks; just "is process up?"
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready") || check.Name == "database",
});
```

The two endpoints answer the two questions independently. Document
them in the runbook so the next responder knows the difference.

---

## 15.4 Containerizing the API

The API ships as a Docker image. A multi-stage `Dockerfile` keeps the
final image small.

**Listing 15.2 — `src/EBookLibrary.WebApi/Dockerfile`.**

```dockerfile
# ---- build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.sln .
COPY src/ src/
COPY tests/ tests/
RUN dotnet restore EBookLibrary.sln
RUN dotnet publish src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj `
    -c Release -o /app/publish --no-restore /p:PublishTrimmed=false

# ---- runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Run as non-root.
RUN useradd -u 1001 -m apiuser && chown -R apiuser /app
USER apiuser

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "EBookLibrary.WebApi.dll"]
```

Three points worth noting.

- **Multi-stage** keeps the final image around 220 MB instead of the
  ~1 GB the SDK image would produce.
- **Non-root user** is the difference between a contained breakout
  and a host compromise. Always.
- **`HEALTHCHECK`** lets the container runtime restart the process if
  liveness fails, even before an orchestrator's probes kick in.

The frontends are similarly trivial: a multi-stage build that runs
`npm run build` (React) or `dotnet publish` (Blazor Wasm) and copies
the static output into an `nginx:alpine` image.

---

## 15.5 Secrets management

Three environments, three mechanisms.

| Environment   | Mechanism                                  | Why                                                      |
|---------------|--------------------------------------------|----------------------------------------------------------|
| Development   | `dotnet user-secrets`                      | Per-developer; not in git; survives `git clean`.         |
| Staging       | Environment variables on the host / pod    | Simple; visible only to the runtime user.                |
| Production    | Azure Key Vault / AWS Secrets Manager      | Audited access; rotation; per-secret RBAC.               |

The application code does *not* know which mechanism is in play. The
deployment manifest pulls the secrets and exposes them as environment
variables; `IConfiguration` reads them by name.

**Listing 15.3 — Kubernetes manifest snippet (production secrets).**

```yaml
spec:
  containers:
    - name: api
      image: registry.example.com/ebook-api:1.4.2
      env:
        - name: ConnectionStrings__Default
          valueFrom:
            secretKeyRef: { name: ebook-secrets, key: connection-string }
        - name: Jwt__Secret
          valueFrom:
            secretKeyRef: { name: ebook-secrets, key: jwt-secret }
```

The double-underscore (`__`) in the env-var name is the
ASP.NET Core convention for nested keys: `ConnectionStrings__Default`
maps to `Configuration["ConnectionStrings:Default"]`.

> **Pitfall:** Logging the entire configuration at startup
> (`builder.Configuration.GetDebugView()`) is a useful debugging
> trick that *will* dump every secret into your log aggregator if you
> leave it in. Use it locally, never in production.

---

## 15.6 Structured logging with Serilog

Plain-text logs are fine until you have to query them. Structured
logging — every log entry is a key-value object — makes them
searchable, aggregatable, alertable.

**Listing 15.4 — `appsettings.json` (Serilog configuration).**

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": { "Microsoft.AspNetCore": "Warning", "System": "Warning" }
  },
  "Enrich": [ "FromLogContext", "WithMachineName", "WithThreadId" ],
  "WriteTo": [
    { "Name": "Console", "Args": { "formatter": "Serilog.Formatting.Json.JsonFormatter, Serilog" } },
    {
      "Name": "Seq",
      "Args": { "serverUrl": "https://seq.example.com" }
    }
  ]
}
```

A correlation id middleware stamps every request:

```csharp
app.Use(async (ctx, next) =>
{
    var id = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString();
    using (Serilog.Context.LogContext.PushProperty("CorrelationId", id))
    {
        ctx.Response.Headers["X-Correlation-Id"] = id;
        await next();
    }
});
```

Now every log entry produced during a request carries the
`CorrelationId` field. A user reports "I got an error at 3:14 PM";
their correlation id (returned in the response header) finds *every*
log line in the system tied to that request.

---

## 15.7 Observability: the four signals

Google's SRE book identifies four "golden signals" worth monitoring
for any user-facing service.

**Table 15.2 — The four golden signals for this project.**

| Signal     | Question it answers                          | Implementation                                       |
|------------|----------------------------------------------|------------------------------------------------------|
| Latency    | How long do requests take?                   | Serilog request logging → percentiles in dashboard   |
| Traffic    | How much demand is on the system?            | Requests per second by route                         |
| Errors     | What proportion of requests fail?            | 4xx (client) and 5xx (server) rates                  |
| Saturation | How "full" is the service?                   | CPU, memory, DB connection-pool usage                |

Instrumenting all four is roughly a day of work with .NET's built-in
metrics (`System.Diagnostics.Metrics`) plus a Prometheus exporter.
Not instrumenting them is the difference between "we found the
problem at 3:14 PM via dashboards" and "we found the problem at 5:42
PM via customer email".

---

## 15.8 Backups, restores, and disaster recovery

Two acronyms govern the conversation: **RPO** (Recovery Point
Objective — how much data can you lose?) and **RTO** (Recovery Time
Objective — how long can you be down?).

For this project's scale and importance, a defensible target is
RPO 1 hour, RTO 4 hours. That implies:

- Hourly transaction-log backups in addition to nightly fulls.
- The backup destination is a *different* region from the primary.
- A documented restore procedure that has been *executed* end-to-end
  at least quarterly.

> **Architect's Note:** The unrestored backup is Schrödinger's
> backup — both valid and invalid until the restore is attempted.
> Half of all "we have backups" claims fail the first restore drill.
> Rehearse the restore.

---

## 15.9 The on-call runbook

The runbook documents what to do when an alert fires. It lives next
to the code, not in a wiki tab no one visits.

**Listing 15.5 — `docs/runbook.md` (table of contents).**

```text
Alert: API 5xx rate > 1% over 5 minutes
  - Symptoms, dashboards, first-response steps, escalation

Alert: Database CPU > 90% over 10 minutes
  - Symptoms, top-query identification, mitigation

Alert: Auth endpoint 401 rate > 50% over 5 minutes
  - Symptoms (likely brute force), rate-limit verification

Alert: Disk usage > 80% on file storage volume
  - Mitigation (rotate old files), root-cause investigation

Alert: Liveness probe failing on >1 replica
  - Roll-back checklist, post-mortem template
```

Five alerts. Three pages each. The point is that a junior on-call
engineer at 3 AM can recover the service without paging the architect.

The *three* alerts you should *not* have:

- **Test environment errors.** Noisy, ignored, train people to ignore
  alerts. Keep them out of the production paging system.
- **Vague "something is slow"** without a defined latency budget. If
  there is no SLO, the alert has nothing to fire against.
- **Per-instance** alerts when you run multiple replicas. Aggregate
  to "across the fleet, X% are unhealthy".

---

## 15.10 The scaling envelope

The project's architecture has a comfortable scaling envelope. Each
threshold below is approximate.

| Stage        | Constraint reached                         | Action                                                              |
|--------------|--------------------------------------------|---------------------------------------------------------------------|
| Single instance, 100 req/s | First CPU saturation                | Vertical scale (bigger box) or add a second instance                |
| Two instances, 1,000 req/s | Database becoming hot                | Add a Redis read cache for the search and detail endpoints         |
| Four instances, 5,000 req/s| Auth round-trips dominating          | Move JWT validation to a sidecar / API gateway; add refresh tokens |
| Ten instances, 20,000 req/s| Single SQL Server saturated           | Read replicas for the reader endpoints; primary for writes         |
| Beyond                     | Single-database paradigm exhausted    | Shard by tenant (if multi-tenant) or extract a read-side service   |

The table is not a roadmap — it is a sequence of *triggers*. Build
for today's load with tomorrow's first step in mind, and stop
worrying about the rest until the metrics force the conversation.

> **In Practice:** "Premature scaling" wastes more engineer-hours
> than any other architectural mistake. The team that can run on a
> $100/month single instance for two years and refactor when the
> business demands it ships features faster than the team that
> spent three months building Kubernetes for ten users.

---

## 15.11 Checkpoint

You are ready for the back matter when:

- [ ] The pre-production checklist of Table 15.1 has all 15 boxes
      ticked for your deployment plan.
- [ ] `docker build` produces an image and `docker run` starts it
      with the connection string supplied via env var.
- [ ] `/health/live` and `/health/ready` answer correctly during a
      simulated database outage.
- [ ] You can describe your secrets-rotation procedure for the JWT
      signing secret.
- [ ] You have a runbook entry for *at least one* of the five alerts
      in § 15.9 and have walked a teammate through it.

---

## Key takeaways

- Production-readiness is a *checklist*, not a feeling. Run through
  Table 15.1 before every release.
- Liveness and readiness probes answer different questions; expose
  them separately.
- Three layered secret stores (user-secrets, env vars, Key Vault) and
  one configuration API. The application is unaware of which is in
  play.
- Structured logs plus correlation ids turn "the user got an error"
  into a precise, instant query.
- The four golden signals (latency, traffic, errors, saturation)
  cover most of what you need to know about a healthy service.
- An untested backup is not a backup. Rehearse the restore.
- Build for today's load with tomorrow's *first* step in mind. Skip
  every step beyond that until the metrics force the conversation.

---

## Exercises

**Easy.** Add a `/health/ready` endpoint to your local stack and
verify it returns `503` when SQL Server is stopped. Verify
`/health/live` continues to return `200`.

**Medium.** Configure Serilog to emit JSON to the console and to a
local Seq instance (`docker run -p 5341:80 datalust/seq`). Add a
correlation-id middleware. Watch a real request flow through Seq with
its correlation id.

**Hard.** Write the *runbook entry* for the alert "API 5xx rate >
1% over 5 minutes". Include: dashboard links, top-five-suspect
queries, the `kubectl` (or equivalent) commands to gather logs from
all replicas, the rollback command, and the post-mortem template.
Walk a teammate through it under simulated incident conditions.

---

## Further reading

- Betsy Beyer et al., *Site Reliability Engineering* (Google) —
  Chapters 4 (SLOs) and 6 (golden signals).
- Microsoft Learn, *Health checks in ASP.NET Core*.
- Serilog documentation. <https://serilog.net/>
- The Twelve-Factor App. <https://12factor.net/>
- Charity Majors, *"Observability — A Manifesto"*.
- AWS / Azure Well-Architected Framework — the operational excellence
  pillar.
