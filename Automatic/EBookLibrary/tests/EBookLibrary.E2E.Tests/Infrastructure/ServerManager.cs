using System.Diagnostics;
using System.Net.Sockets;

namespace EBookLibrary.E2E.Tests.Infrastructure;

/// <summary>
/// Manages starting/stopping the WebApi, Blazor, and React dev servers for E2E tests.
/// Pre-builds .NET projects so startup is fast. Uses port polling for health checks.
/// Servers that were already running when tests started are NOT killed at teardown.
/// Set FRONTEND=react to start the Vite React server instead of Blazor.
/// </summary>
public static class ServerManager
{
    private static Process? _apiProcess;
    private static Process? _blazorProcess;
    private static Process? _reactProcess;

    // AppContext.BaseDirectory = .../tests/EBookLibrary.E2E.Tests/bin/Debug/net10.0/
    // 5 levels up = solution root (.../EBookLibrary/)
    private static readonly string SolutionRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    public static async Task EnsureServersRunningAsync()
    {
        Console.WriteLine($"[ServerManager] Solution root: {SolutionRoot}");

        var frontend = Environment.GetEnvironmentVariable("FRONTEND") ?? "blazor";
        var isReact = frontend.Equals("react", StringComparison.OrdinalIgnoreCase);

        // Pre-build .NET projects
        await BuildProjectAsync("src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj", "WebApi");
        if (!isReact)
            await BuildProjectAsync("src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj", "Blazor");

        await EnsureApiRunningAsync();
        if (isReact)
            await EnsureReactRunningAsync();
        else
            await EnsureFrontendRunningAsync();
    }

    private static async Task BuildProjectAsync(string relPath, string label)
    {
        var projectPath = Path.Combine(SolutionRoot, relPath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(projectPath))
        {
            Console.WriteLine($"[ServerManager] ! Project not found: {projectPath}");
            return;
        }

        Console.WriteLine($"[ServerManager] → Building {label}...");
        using var p = new Process
        {
            StartInfo = new ProcessStartInfo("dotnet", $"build \"{projectPath}\" -c Debug --nologo -v q")
            {
                WorkingDirectory = SolutionRoot,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            }
        };
        p.OutputDataReceived += (_, _) => { };
        p.ErrorDataReceived  += (_, _) => { };
        p.Start();
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();
        await p.WaitForExitAsync();
        Console.WriteLine($"[ServerManager] ✓ {label} built (exit: {p.ExitCode}).");
    }

    private static async Task EnsureApiRunningAsync()
    {
        if (await IsPortOpenAsync(5149))
        {
            Console.WriteLine("[ServerManager] ✓ WebApi already running on :5149");
            return;
        }

        Console.WriteLine("[ServerManager] → Starting WebApi (--no-build)...");
        var project = Path.Combine(SolutionRoot, "src", "EBookLibrary.WebApi", "EBookLibrary.WebApi.csproj");
        _apiProcess = Launch("dotnet", $"run --no-build --project \"{project}\" --launch-profile http");
        await WaitForPortAsync(5149, TimeSpan.FromSeconds(60), "WebApi :5149");
        Console.WriteLine("[ServerManager] ✓ WebApi ready.");
    }

    private static async Task EnsureFrontendRunningAsync()
    {
        var baseUrl = Environment.GetEnvironmentVariable("BASE_URL") ?? "https://localhost:7278";
        var uri = new Uri(baseUrl);

        // The Blazor launchSettings binds both 7278 (https) and 5014 (http).
        // We check the primary port, and fall back to polling port 5014 for health-check
        // so HttpClient doesn't need to trust the self-signed dev cert.
        const int blazorHttpPort = 5014;

        if (await IsPortOpenAsync(uri.Port) || await IsPortOpenAsync(blazorHttpPort))
        {
            Console.WriteLine($"[ServerManager] ✓ Blazor already running (:{uri.Port} or :{blazorHttpPort})");
            return;
        }

        Console.WriteLine($"[ServerManager] → Starting Blazor (--no-build, https profile)...");
        var project = Path.Combine(SolutionRoot, "src", "EBookLibrary.Blazor", "EBookLibrary.Blazor.csproj");
        _blazorProcess = Launch("dotnet", $"run --no-build --project \"{project}\" --launch-profile https");

        // Wait for the HTTP port — no HTTPS cert required for health polling
        await WaitForPortAsync(blazorHttpPort, TimeSpan.FromSeconds(60), $"Blazor :{blazorHttpPort}");

        // Give the HTTPS listener an extra moment to bind
        await Task.Delay(2000);
        Console.WriteLine($"[ServerManager] ✓ Blazor ready ({baseUrl}).");
    }

    private static async Task EnsureReactRunningAsync()
    {
        const int reactPort = 5173;
        if (await IsPortOpenAsync(reactPort))
        {
            Console.WriteLine("[ServerManager] ✓ React already running on :5173");
            return;
        }

        Console.WriteLine("[ServerManager] → Starting React (npm run dev)...");
        var reactDir = Path.Combine(SolutionRoot, "src", "EBookLibrary.React");
        // On Windows, npm is a .cmd script — use cmd /c to resolve it
        _reactProcess = Launch("cmd", $"/c npm run dev", reactDir);
        await WaitForPortAsync(reactPort, TimeSpan.FromSeconds(90), "React :5173");
        Console.WriteLine("[ServerManager] ✓ React ready.");
    }

    public static void StopServers()
    {
        TryKill(_apiProcess, "WebApi");
        TryKill(_blazorProcess, "Blazor");
        TryKill(_reactProcess, "React");
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static Process Launch(string filename, string arguments, string? workingDirectory = null)
    {
        var p = new Process
        {
            StartInfo = new ProcessStartInfo(filename, arguments)
            {
                WorkingDirectory = workingDirectory ?? SolutionRoot,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            }
        };
        p.OutputDataReceived += (_, _) => { };
        p.ErrorDataReceived  += (_, _) => { };
        p.Start();
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();
        return p;
    }

    private static async Task<bool> IsPortOpenAsync(int port)
    {
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync("127.0.0.1", port).WaitAsync(TimeSpan.FromMilliseconds(500));
            return true;
        }
        catch { return false; }
    }

    private static async Task WaitForPortAsync(int port, TimeSpan timeout, string label)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (await IsPortOpenAsync(port)) return;
            await Task.Delay(1500);
        }
        throw new TimeoutException($"[ServerManager] {label} did not open within {timeout.TotalSeconds}s");
    }

    private static void TryKill(Process? proc, string name)
    {
        if (proc is null || proc.HasExited) return;
        try
        {
            proc.Kill(entireProcessTree: true);
            Console.WriteLine($"[ServerManager] ✓ Stopped {name}.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ServerManager] ! Could not stop {name}: {ex.Message}");
        }
    }
}
