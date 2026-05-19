# Chapter 16 — React Fundamentals: A Structured Introduction

> *"React is not magic — it is a systematic answer to the question
> 'how do I keep the DOM in sync with changing data?'"*

---

## What you will learn

- Why React exists and how it thinks about UIs differently from
  plain HTML.
- What JSX is and how it compiles to JavaScript.
- How to write a typed React component with props and state.
- The two hooks you will use in every component: `useState` and
  `useEffect`.
- Enough TypeScript to be productive: interfaces, generics, union
  types, and optional properties.

You will write no application code in this chapter. You will write
small, isolated examples that demonstrate each concept so that
later chapters have firm foundations to build on.

---

## 16.1 Why React?

A web browser renders HTML. The HTML comes from the server, or from
JavaScript that adds and removes DOM nodes. When you write plain
JavaScript you manipulate the DOM directly: `document.getElementById`,
`element.textContent = ...`, `element.appendChild(...)`. That is fine
for a single interactive widget but becomes unmanageable when dozens of
pieces of data drive dozens of UI elements at once. Keeping them in
sync by hand is the source of most frontend bugs.

React answers the question differently. Instead of telling the browser
*what to change*, you describe *what the UI should look like* for a
given piece of data. React figures out the minimal DOM changes needed
to move from the old description to the new one. You write:

```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
```

When `name` changes, React re-runs the function, produces a new
description, compares it with the old one (a process called
*reconciliation*), and applies only the changed parts to the DOM. You
never touch `document.getElementById` again.

This model has three important consequences:

1. **Predictability.** The UI is always a function of its data. The
   same data always produces the same UI.
2. **Composability.** A complex UI is built from small, reusable
   components — just like functions are built from smaller functions.
3. **Declarative data flow.** Data flows down through props; events
   bubble up through callbacks. There is one clear path for every
   piece of information.

---

## 16.2 JSX: HTML that compiles to JavaScript

The `<h1>Hello, {name}!</h1>` syntax is *JSX*. It is not HTML. It is
a JavaScript syntax extension that Vite's TypeScript compiler
transforms into ordinary function calls before the browser sees it.

```tsx
// What you write (JSX):
const element = <h1 className="title">Hello!</h1>;

// What the compiler produces:
const element = React.createElement('h1', { className: 'title' }, 'Hello!');
```

JSX rules you must know:

| Rule | Example |
|------|---------|
| Use `className`, not `class` | `<div className="box">` |
| Every element must be closed | `<input />` not `<input>` |
| A component must return a **single root** element | Wrap siblings in `<>…</>` |
| Expressions go in `{}` | `<p>{count} items</p>` |
| `false`, `null`, and `undefined` render nothing | Useful for conditional rendering |

**Listing 16.1 — JSX rules demonstrated.**

```tsx
function Card({ title, count, isNew }: CardProps) {
  return (
    <>
      <h2 className="font-bold">{title}</h2>
      <p>{count} items</p>
      {isNew && <span className="badge">NEW</span>}
    </>
  );
}
```

The `{isNew && <span>...}` pattern is the standard React idiom for
conditional rendering. When `isNew` is `false`, the `&&` short-circuits
and nothing is rendered.

---

## 16.3 Functional components and props

A React component is a TypeScript function that accepts a single
argument — conventionally called *props* — and returns JSX (or
`null`). Props are the inputs to the component.

**Listing 16.2 — A typed component with props.**

```tsx
interface BookTitleProps {
  title: string;
  author: string;
  pages?: number;   // optional — the ? means it may be undefined
}

function BookTitle({ title, author, pages }: BookTitleProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>by {author}</p>
      {pages !== undefined && <p>{pages} pages</p>}
    </div>
  );
}

// Usage:
<BookTitle title="Don Quixote" author="Cervantes" pages={863} />
<BookTitle title="Lazarillo de Tormes" author="Anonymous" />
```

The TypeScript interface describes the shape of props. The compiler
rejects any usage that passes the wrong types or omits a required
prop. This is the primary reason to use TypeScript in React — errors
are caught at development time, not at the user's browser.

> **Key insight:** Props flow *downward* from parent to child. A
> parent passes data to a child by adding attributes. A child cannot
> directly change its parent's data. This one-way flow is what makes
> React applications predictable.

---

## 16.4 State: internal memory with `useState`

Props are immutable inputs. State is mutable memory that belongs to a
component. When state changes, React re-renders the component with the
new value.

`useState` is the hook that creates a piece of state. It returns a
tuple: the current value and a setter function.

**Listing 16.3 — A counter with useState.**

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);   // initial value: 0

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}
```

When `setCount` is called, React schedules a re-render. On the next
render, `count` will have the new value. You never mutate the state
variable directly — always call the setter.

**Listing 16.4 — State with an object (the form pattern used in this project).**

```tsx
interface BookForm {
  title: string;
  pages: number;
  language: string;
}

function BookFormDemo() {
  const [form, setForm] = useState<BookForm>({
    title: '', pages: 1, language: 'English',
  });

  // Spread the existing state, then override the changed field
  const updateTitle = (value: string) =>
    setForm(prev => ({ ...prev, title: value }));

  return (
    <input
      value={form.title}
      onChange={e => updateTitle(e.target.value)}
    />
  );
}
```

The `prev => ({ ...prev, title: value })` pattern is the standard
way to update a single field in an object state. The spread `...prev`
copies all existing fields, and `title: value` overwrites just the one
that changed.

---

## 16.5 Side effects with `useEffect`

`useEffect` runs code *after* React has rendered the component to the
DOM. It is used for anything that is not pure rendering: fetching data,
subscribing to events, setting document title, and similar.

**Listing 16.5 — Three forms of useEffect.**

```tsx
import { useState, useEffect } from 'react';

function DocumentTitle({ title }: { title: string }) {
  // 1. Runs after EVERY render (no dependency array)
  useEffect(() => {
    document.title = title;
  });

  // 2. Runs ONCE on mount (empty dependency array)
  useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');   // cleanup
  }, []);

  // 3. Runs when `title` changes (dependency array with `title`)
  useEffect(() => {
    document.title = title;
  }, [title]);

  return <h1>{title}</h1>;
}
```

The dependency array tells React *when* to re-run the effect. Omit it
and the effect runs every render (rarely what you want). Pass an empty
array and it runs once. Pass `[someValue]` and it runs whenever
`someValue` changes.

> **Important:** In this project, all data fetching is handled by
> TanStack Query — not `useEffect`. The places where you *will* use
> `useEffect` are: syncing URL search params to local state, attaching
> event listeners (like scroll), and setting page titles.

---

## 16.6 Event handlers

Event handlers in JSX are camelCase function props:
`onClick`, `onChange`, `onSubmit`, `onKeyDown`. They receive a
synthetic event object that wraps the native browser event.

**Listing 16.6 — Common event handler patterns.**

```tsx
function FormDemo() {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // onChange: fires on every keystroke
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  // onSubmit: fires when the form is submitted
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();         // prevent full-page reload
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={value} onChange={handleChange} />
      <button type="submit">Submit</button>
      {submitted && <p>You submitted: {value}</p>}
    </form>
  );
}
```

The `e.preventDefault()` call in `onSubmit` is required to stop the
browser from reloading the page — the default behaviour of an HTML
form submission. In a SPA there is never a server to submit to.

---

## 16.7 TypeScript for React developers

You already know HTML and JavaScript. Here are the four TypeScript
concepts used throughout this project that you need before proceeding.

### Interfaces and types

An `interface` or `type` alias names the shape of a JavaScript object.
Use `interface` for data shapes (props, API responses); use `type` for
unions.

```typescript
interface User {
  id: string;
  email: string;
  role: 'Regular' | 'Admin';   // union type: only these two strings
}

type Status = 'Available' | 'Unavailable' | 'Removed';
```

### Optional properties

Append `?` to a property name to make it optional (can be `undefined`).

```typescript
interface BookSummary {
  id: string;
  title: string;
  coverImageUrl?: string;   // may be absent — always check before using
  publicationYear?: number;
}
```

### Generics

Generics let you write a type that works for *any* contained type.
The API returns all data wrapped in `ApiResponse<T>`. The `T` is a
placeholder filled in at the call site.

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// A response that contains a User:
const response: ApiResponse<User> = await fetchUser(id);
// TypeScript knows response.data is User | undefined.
```

### The `as` assertion (use sparingly)

When TypeScript cannot infer the type and you are certain of the shape,
cast with `as`. Avoid it in application code; it bypasses the type
system. The one place it appears in this project is when reading raw
error objects from the Axios response.

```typescript
const err = error as { response?: { data?: { message?: string } } };
```

---

## 16.8 A complete typed component to consolidate

Putting all of the above together: a component that displays a book
summary card, accepts typed props, conditionally renders optional
fields, and calls back to the parent when clicked.

**Listing 16.7 — A complete typed component.**

```tsx
import { useState } from 'react';

interface BookSummary {
  id: string;
  title: string;
  author: string;
  pages?: number;
  isAvailable: boolean;
}

interface BookCardProps {
  book: BookSummary;
  onSelect: (id: string) => void;
}

function BookCard({ book, onSelect }: BookCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(book.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ border: hovered ? '2px solid blue' : '2px solid transparent' }}
    >
      <h3>{book.title}</h3>
      <p>by {book.author}</p>
      {book.pages !== undefined && <p>{book.pages} pages</p>}
      {book.isAvailable
        ? <span style={{ color: 'green' }}>Available</span>
        : <span style={{ color: 'red' }}>Unavailable</span>
      }
    </div>
  );
}
```

This component:
- Accepts typed props (`BookCardProps`) that the compiler enforces.
- Holds local state (`hovered`) that does not need to be shared.
- Conditionally renders `pages` only when the value is present.
- Calls the `onSelect` callback with the book's ID — the parent
  decides what to do with that information.
- Uses no global variables, no `document.getElementById`, and no
  direct DOM manipulation.

---

## Key takeaways

- React components are functions: props in → JSX out.
- State changes trigger re-renders; never mutate state directly.
- Use `useEffect` for side effects; use TanStack Query for
  data fetching (Chapter 20).
- TypeScript catches errors at compile time; keep types close to
  the data they describe.
- Data flows down through props; events bubble up through callbacks.

---

*Proceed to Chapter 17 to scaffold the real project.*
