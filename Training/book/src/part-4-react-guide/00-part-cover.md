# Part IV

## Building the React Frontend from Scratch

> *"A frontend is a user's promise that your backend works.
> Build it so the promise is never broken."*

Part II, Chapter 10 explained the *architecture* of the React frontend —
the layering, the state-management choices, the query-caching strategy.
Part IV teaches you to *build it yourself*, file by file, from the first
`npm create` command to a fully running bilingual SPA connected to the
EBook Library API.

The audience is a developer who knows HTML, CSS, and JavaScript but has
not yet written a React application. Every concept is introduced at the
moment it is needed, in the context of a real feature, with a complete
and buildable code listing.

The twelve chapters follow the natural construction order of a React
project: environment and tooling first, then data contracts, then HTTP
infrastructure, then state management, then routing, then individual
pages in order of complexity, then internationalisation, then the build
pipeline.

**What you will have at the end of Part IV:**

- A Vite + React 19 + TypeScript SPA running on port 5173.
- An Axios HTTP client with JWT injection and automatic 401 handling.
- A Zustand auth store that survives browser refreshes.
- TanStack Query managing all server state with caching and
  pagination.
- All public pages: Home, Search, Book Detail, Login, Register.
- A protected Profile page visible only to authenticated users.
- A full Admin panel (Dashboard, Books, Authors, Genres, Users,
  ePub Upload) restricted to users with the Admin role.
- Full bilingual support: English and Spanish, toggled with a single
  button click.

**Prerequisites:** The EBook Library Web API (Part II, Chapters 4–9)
must be running on `http://localhost:5149` and the database seeded
before you attempt the browser checkpoints in Chapters 19 onwards.
