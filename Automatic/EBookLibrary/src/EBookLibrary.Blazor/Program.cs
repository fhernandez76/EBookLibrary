using Blazored.LocalStorage;
using EBookLibrary.Blazor;
using EBookLibrary.Blazor.Services;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
using System.Globalization;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "http://localhost:5000/api/";
if (!apiBaseUrl.EndsWith('/')) apiBaseUrl += '/';

// Auth
builder.Services.AddBlazoredLocalStorage();
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<CustomAuthStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(sp =>
    sp.GetRequiredService<CustomAuthStateProvider>());

// HTTP client with JWT interceptor
builder.Services.AddScoped(sp =>
{
    var localStorage = sp.GetRequiredService<ILocalStorageService>();
    var handler = new AuthorizationMessageHandler(localStorage);
    return new HttpClient(handler) { BaseAddress = new Uri(apiBaseUrl) };
});

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BookService>();
builder.Services.AddScoped<CatalogService>();

// Localization
builder.Services.AddLocalization(opt => opt.ResourcesPath = "Resources");

var host = builder.Build();

// Apply persisted culture before first render
var js = host.Services.GetRequiredService<IJSRuntime>();
var savedCulture = await js.InvokeAsync<string?>("localStorage.getItem", "BlazorCulture");
if (!string.IsNullOrWhiteSpace(savedCulture))
{
    var culture = new CultureInfo(savedCulture);
    CultureInfo.DefaultThreadCurrentCulture = culture;
    CultureInfo.DefaultThreadCurrentUICulture = culture;
}

await host.RunAsync();
