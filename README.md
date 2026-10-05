# Example Express + TypeScript + Drizzle ORM (PostgreSQL)

A production-ready REST API built with **Node.js, Express, TypeScript, and Drizzle ORM** following a strict **4-layer architecture** with manual constructor dependency injection and composition root.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
  - [The 4 Layers](#the-4-layers)
  - [Request / Response Flow](#request--response-flow)
  - [Dependency Injection & Composition Root](#dependency-injection--composition-root)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Migrations](#database-migrations)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [User Endpoints](#user-endpoints)
  - [Standard Envelopes & Error Handling](#standard-envelopes--error-handling)
- [NPM Scripts](#npm-scripts)
- [How to Add a New Resource (Step-by-Step)](#how-to-add-a-new-resource-step-by-step)
  - [Step 1: Database Schema](#step-1-database-schema)
  - [Step 2: Zod Schemas & DTOs](#step-2-zod-schemas--dtos)
  - [Step 3: Repository Interface & Implementation](#step-3-repository-interface--implementation)
  - [Step 4: Service Layer](#step-4-service-layer)
  - [Step 5: Controller Layer](#step-5-controller-layer)
  - [Step 6: Routes](#step-6-routes)
  - [Step 7: Wire in Composition Root & App Router](#step-7-wire-in-composition-root--app-router)
- [Production & Reliability Features](#production--reliability-features)

---

## Architecture Overview

This project strictly enforces a unidirectional 4-layer architecture:

```
[ HTTP Request ]
       │
       ▼
┌──────────────┐
│    Routes    │  <-- Defines paths, HTTP verbs, attaches validation middleware
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Controllers  │  <-- HTTP-only adapter: extracts params/body/query, calls Service
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Services   │  <-- Pure business logic: validation rules, throws typed AppErrors
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Repositories │  <-- Data persistence via Drizzle ORM, returns plain typed entities
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  PostgreSQL  │
└──────────────┘
```

### The 4 Layers

| Layer                                     | Responsibility                                                                                                                                                         | Allowed Imports / Dependencies                                                       | Forbidden                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **1. Routes** (`src/routes/`)             | Registers URL paths, assigns HTTP methods, attaches Zod `validate` middleware, maps endpoints to controller methods.                                                   | Express `Router`, Controllers, Middlewares, Zod schemas                              | Business logic, DB access, direct service calls      |
| **2. Controllers** (`src/controllers/`)   | HTTP adapter layer. Unpacks input from `req`, calls Service methods, and formats the output via `sendSuccess` / `sendNoContent`.                                       | Services, DTO types, HTTP response helpers                                           | Business logic, direct DB access, Drizzle queries    |
| **3. Services** (`src/services/`)         | Encapsulates all domain and business rules. Evaluates invariants, checks unique constraints, performs pagination calculations, and throws typed `AppError` subclasses. | Repository interfaces (`IRepository`), DTO types, Domain types, Custom error classes | Express types (`req`, `res`), Drizzle schema/queries |
| **4. Repositories** (`src/repositories/`) | The **only** layer that executes SQL / Drizzle queries. Implements repository interfaces, maps database rows to typed domain entities.                                 | Drizzle ORM client, Drizzle table definitions, Repository interfaces                 | HTTP concepts, business decisions                    |

### Request / Response Flow

1. An incoming request hits global middlewares (Helmet, JSON body parsing, URL-encoded parsing, request logger with unique `X-Request-Id`).
2. The router matches the path and executes the `validate({ params, query, body })` middleware.
3. If validation fails, `ValidationError` (subclass of `AppError`) is thrown and caught by Express 5's native async error boundary, forwarding to `errorHandler`.
4. The controller receives parsed, type-safe data and invokes the appropriate service method.
5. The service executes domain logic. If business rules are violated (e.g. duplicate email, record not found), it throws a typed `ConflictError`, `NotFoundError`, etc.
6. The service accesses the database exclusively through the injected repository interface (`IUserRepository`).
7. The repository returns plain typed entity records (`User`, `User[]`).
8. The controller wraps the returned data with `sendSuccess(res, data, statusCode, meta)` producing a uniform `{ success: true, data }` response.

### Dependency Injection & Composition Root

Dependencies are explicitly wired via constructors in a single **composition root** (`src/container.ts`). There is no reflection magic or runtime DI container library:

```ts
// src/container.ts
export function createContainer(db: Database) {
  // 1. Repositories (depend on DB client)
  const userRepository = new UserRepository(db);

  // 2. Services (depend on Repository interfaces)
  const userService = new UserService(userRepository);

  // 3. Controllers (depend on Services)
  const userController = new UserController(userService);

  return {
    repositories: { user: userRepository },
    services: { user: userService },
    controllers: { user: userController },
  };
}
```

This pattern makes unit testing trivial: you can pass mock repository implementations to `UserService` without spinning up a database.

---

## Tech Stack

- **Runtime**: Node.js (v22+ LTS)
- **Framework**: Express 5 (native async handler support)
- **Language**: TypeScript 7 with strict type checking and `@/*` path aliases
- **ORM**: Drizzle ORM + `drizzle-kit` for automated PostgreSQL schema migrations
- **Driver**: `pg` (node-postgres) with connection pooling
- **Validation**: Zod 4 for strict runtime validation (environment variables, request body, params, query)
- **Formatting**: Prettier
- **Dev Runner**: `tsx` (fast TypeScript execution with watch mode)
- **Build**: `tsc` + `tsc-alias` (replaces path aliases with relative paths for zero-overhead production runtime)
- **Package Manager**: `pnpm`

---

## Project Structure

```
.
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore configuration
├── .prettierignore                  # Prettier ignore paths
├── .prettierrc                      # Prettier formatting rules
├── drizzle.config.ts                # Drizzle Kit migration & introspect configuration
├── package.json                     # Scripts, engine requirements, and dependencies
├── pnpm-workspace.yaml              # pnpm configuration
├── tsconfig.json                    # Base TypeScript strict configuration
├── tsconfig.build.json              # Production build compilation configuration
├── README.md                        # Documentation
└── src/
    ├── app.ts                       # Express application factory (security, middleware, routing)
    ├── container.ts                 # Composition root (manual dependency injection)
    ├── server.ts                    # Application entry point, HTTP listener, graceful shutdown
    ├── config/
    │   ├── env.ts                   # Zod environment schema & fail-fast validator
    │   └── index.ts                 # Typed immutable application settings
    ├── controllers/
    │   ├── health.controller.ts     # Health check HTTP controller
    │   └── user.controller.ts       # User CRUD HTTP controller
    ├── db/
    │   ├── index.ts                 # PostgreSQL pg.Pool & Drizzle client initialization
    │   ├── migrations/              # SQL migrations generated by drizzle-kit
    │   └── schema/
    │       ├── index.ts             # Drizzle tables export barrel
    │       └── users.ts             # Users table schema & $infer types
    ├── errors/
    │   ├── app-error.ts             # AppError base class
    │   ├── http-errors.ts           # NotFoundError, BadRequestError, ConflictError, etc.
    │   └── index.ts                 # Error barrel
    ├── middlewares/
    │   ├── error-handler.ts         # Centralized error translation middleware
    │   ├── index.ts                 # Middlewares barrel
    │   ├── not-found.ts             # 404 handler for unmatched routes
    │   ├── request-logger.ts        # Request duration logging with X-Request-Id
    │   └── validate.ts              # Reusable Zod schema validation middleware
    ├── repositories/
    │   ├── health.repository.ts     # Database ping persistence implementation
    │   ├── user.repository.ts       # Drizzle PostgreSQL user persistence implementation
    │   └── interfaces/
    │       ├── health.repository.interface.ts  # IHealthRepository contract
    │       └── user.repository.interface.ts    # IUserRepository contract
    ├── routes/
    │   ├── health.routes.ts         # /health router
    │   ├── index.ts                 # /api router aggregator
    │   └── user.routes.ts           # /api/users resource router
    ├── services/
    │   ├── health.service.ts        # Health check business logic
    │   └── user.service.ts          # User CRUD business logic & invariants
    ├── types/
    │   ├── api.ts                   # Standard API response envelopes & pagination types
    │   ├── http.ts                  # TypedRequest and AsyncRequestHandler helpers
    │   └── user.dto.ts              # Zod validation schemas & inferred DTO types
    └── utils/
        ├── http-response.ts         # sendSuccess & sendNoContent helper functions
        ├── http-status.ts           # HTTP status constants
        └── logger.ts                # Structured JSON / dev console logger
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 9.0.0` (or `corepack enable pnpm`)
- **PostgreSQL**: `>= 14` (running locally or via Docker)

### Installation

```bash
# Clone or navigate to the project directory
cd Example-express-ts-drizzle

# Install dependencies
pnpm install
```

### Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/example_db
```

> **Note**: If `DATABASE_URL` is missing or invalid, the app will fail fast at startup with an informative validation message.

### Database Migrations

Generate migration files from the Drizzle schema and apply them to the database:

```bash
# 1. Generate SQL migration files from src/db/schema/*.ts
pnpm db:generate

# 2. Apply migrations to your PostgreSQL database
pnpm db:migrate

# Alternatively, push schema directly in prototyping mode:
# pnpm db:push
```

To inspect your database visually via Drizzle Studio:

```bash
pnpm db:studio
```

### Running the Application

```bash
# Development (with tsx hot-reload & watch mode)
pnpm dev

# Type-checking
pnpm typecheck

# Code formatting
pnpm format
pnpm format:check

# Production build
pnpm build

# Start production build
pnpm start
```

---

## API Reference

### Health Check

#### `GET /health`

Verifies server health and database connectivity.

**Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-10-04T07:30:00.000Z",
    "uptimeSeconds": 120,
    "checks": {
      "database": "up"
    }
  }
}
```

---

### User Endpoints

Base path: `/api/users`

| Method   | Endpoint         | Description            | Request Body / Query                                            |
| -------- | ---------------- | ---------------------- | --------------------------------------------------------------- |
| `POST`   | `/api/users`     | Create a new user      | `{ "name": "Alice", "email": "alice@example.com" }`             |
| `GET`    | `/api/users`     | List users (paginated) | Query: `?page=1&limit=20`                                       |
| `GET`    | `/api/users/:id` | Get user by ID         | Path param: `:id` (UUID)                                        |
| `PATCH`  | `/api/users/:id` | Update user            | `{ "name"?: "Alice Smith", "email"?: "alice.new@example.com" }` |
| `DELETE` | `/api/users/:id` | Delete user            | Path param: `:id` (UUID)                                        |

#### 1. Create User

**`POST /api/users`**

```json
// Request Body
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com"
}
```

**Response `201 Created`**:

```json
{
  "success": true,
  "data": {
    "id": "c62391ce-df95-460d-a36c-e5bc411516e4",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-10-04T07:30:00.000Z",
    "updatedAt": "2026-10-04T07:30:00.000Z"
  }
}
```

#### 2. List Users

**`GET /api/users?page=1&limit=10`**
**Response `200 OK`**:

```json
{
  "success": true,
  "data": [
    {
      "id": "c62391ce-df95-460d-a36c-e5bc411516e4",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "createdAt": "2026-10-04T07:30:00.000Z",
      "updatedAt": "2026-10-04T07:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### 3. Get User by ID

**`GET /api/users/c62391ce-df95-460d-a36c-e5bc411516e4`**
**Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "id": "c62391ce-df95-460d-a36c-e5bc411516e4",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-10-04T07:30:00.000Z",
    "updatedAt": "2026-10-04T07:30:00.000Z"
  }
}
```

#### 4. Update User

**`PATCH /api/users/c62391ce-df95-460d-a36c-e5bc411516e4`**

```json
// Request Body
{
  "name": "Jane M. Doe"
}
```

**Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "id": "c62391ce-df95-460d-a36c-e5bc411516e4",
    "name": "Jane M. Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-10-04T07:30:00.000Z",
    "updatedAt": "2026-10-04T07:35:00.000Z"
  }
}
```

#### 5. Delete User

**`DELETE /api/users/c62391ce-df95-460d-a36c-e5bc411516e4`**
**Response `204 No Content`** (empty body).

---

### Standard Envelopes & Error Handling

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // optional, included for paginated lists
}
```

#### Validation Error (`400 Bad Request`)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "location": "body",
      "path": "email",
      "message": "email must be a valid email address"
    }
  ]
}
```

#### Business Conflict Error (`409 Conflict`)

```json
{
  "success": false,
  "message": "Email is already in use",
  "errors": [
    {
      "location": "body",
      "path": "email",
      "message": "'jane.doe@example.com' is already registered"
    }
  ]
}
```

#### Resource Not Found (`404 Not Found`)

```json
{
  "success": false,
  "message": "User with id 'c62391ce-df95-460d-a36c-e5bc411516e4' not found"
}
```

---

## NPM Scripts

| Script              | Command                                                                         | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`          | `tsx watch --clear-screen=false src/server.ts`                                  | Starts local dev server with auto-restart on changes.                           |
| `pnpm build`        | `rm -rf dist && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json` | Type-checks, compiles TypeScript into `dist/`, and rewrites `@/*` path aliases. |
| `pnpm start`        | `NODE_ENV=production node dist/server.js`                                       | Runs the compiled production build.                                             |
| `pnpm typecheck`    | `tsc --noEmit`                                                                  | Runs strict TypeScript type-checking across the entire project.                 |
| `pnpm format`       | `prettier --write .`                                                            | Formats all code according to `.prettierrc`.                                    |
| `pnpm format:check` | `prettier --check .`                                                            | Verifies code conforms to Prettier formatting.                                  |
| `pnpm db:generate`  | `drizzle-kit generate`                                                          | Generates SQL migration files from Drizzle schemas.                             |
| `pnpm db:migrate`   | `drizzle-kit migrate`                                                           | Applies pending migrations to the PostgreSQL database.                          |
| `pnpm db:push`      | `drizzle-kit push`                                                              | Pushes schema directly to the database without generating migrations.           |
| `pnpm db:studio`    | `drizzle-kit studio`                                                            | Starts Drizzle Studio GUI on `https://local.drizzle.studio`.                    |

---

## How to Add a New Resource (Step-by-Step)

Here is the complete walkthrough for adding a new resource (e.g. `Post`) across all 4 architectural layers.

### Step 1: Database Schema

Create `src/db/schema/posts.ts`:

```ts
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

Export it in `src/db/schema/index.ts`:

```ts
export * from './users';
export * from './posts';
```

Run `pnpm db:generate` to generate the migration file.

---

### Step 2: Zod Schemas & DTOs

Create `src/types/post.dto.ts`:

```ts
import { z } from 'zod';
import { config } from '@/config';

export const postIdParamsSchema = z.object({
  id: z.uuid({ error: 'id must be a valid UUID' }),
});

export const createPostBodySchema = z.strictObject({
  authorId: z.uuid({ error: 'authorId must be a valid UUID' }),
  title: z.string().trim().min(1, 'title is required').max(255),
  content: z.string().min(1, 'content is required'),
});

export const updatePostBodySchema = createPostBodySchema
  .omit({ authorId: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    error: 'At least one field must be provided',
  });

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(config.pagination.maxLimit)
    .default(config.pagination.defaultLimit),
});

export type PostIdParams = z.infer<typeof postIdParamsSchema>;
export type CreatePostDto = z.infer<typeof createPostBodySchema>;
export type UpdatePostDto = z.infer<typeof updatePostBodySchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
```

---

### Step 3: Repository Interface & Implementation

1. Define the interface `src/repositories/interfaces/post.repository.interface.ts`:

```ts
import type { NewPost, Post } from '@/db/schema';
import type { FindAllOptions } from './user.repository.interface';

export type { NewPost, Post };
export type UpdatePost = Partial<Pick<NewPost, 'title' | 'content'>>;

export interface IPostRepository {
  findAll(options: FindAllOptions): Promise<Post[]>;
  count(): Promise<number>;
  findById(id: string): Promise<Post | null>;
  create(data: NewPost): Promise<Post>;
  update(id: string, data: UpdatePost): Promise<Post | null>;
  delete(id: string): Promise<boolean>;
}
```

2. Implement the repository `src/repositories/post.repository.ts`:

```ts
import { count, desc, eq } from 'drizzle-orm';
import type { Database } from '@/db';
import { posts } from '@/db/schema';
import type {
  FindAllOptions,
  IPostRepository,
  NewPost,
  Post,
  UpdatePost,
} from '@/repositories/interfaces/post.repository.interface';

export class PostRepository implements IPostRepository {
  constructor(private readonly db: Database) {}

  async findAll({ limit, offset }: FindAllOptions): Promise<Post[]> {
    return this.db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit)
      .offset(offset);
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(posts);
    return row?.value ?? 0;
  }

  async findById(id: string): Promise<Post | null> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return post ?? null;
  }

  async create(data: NewPost): Promise<Post> {
    const [post] = await this.db.insert(posts).values(data).returning();
    if (!post) throw new Error('Insert into "posts" returned no row');
    return post;
  }

  async update(id: string, data: UpdatePost): Promise<Post | null> {
    const [post] = await this.db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return post ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
    return deleted.length > 0;
  }
}
```

---

### Step 4: Service Layer

Create `src/services/post.service.ts`:

```ts
import { NotFoundError } from '@/errors';
import type {
  IPostRepository,
  Post,
  UpdatePost,
} from '@/repositories/interfaces/post.repository.interface';
import type { IUserRepository } from '@/repositories/interfaces/user.repository.interface';
import type { PaginatedResult, PaginationParams } from '@/types/api';
import type { CreatePostDto, UpdatePostDto } from '@/types/post.dto';

export class PostService {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async listPosts({ page, limit }: PaginationParams): Promise<PaginatedResult<Post>> {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.postRepository.findAll({ limit, offset }),
      this.postRepository.count(),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPostById(id: string): Promise<Post> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundError(`Post with id '${id}' not found`);
    return post;
  }

  async createPost(dto: CreatePostDto): Promise<Post> {
    const author = await this.userRepository.findById(dto.authorId);
    if (!author) throw new NotFoundError(`Author with id '${dto.authorId}' does not exist`);

    return this.postRepository.create(dto);
  }

  async updatePost(id: string, dto: UpdatePostDto): Promise<Post> {
    await this.getPostById(id);

    const changes: UpdatePost = {};
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.content !== undefined) changes.content = dto.content;

    if (Object.keys(changes).length === 0) return this.getPostById(id);

    const updated = await this.postRepository.update(id, changes);
    if (!updated) throw new NotFoundError(`Post with id '${id}' not found`);
    return updated;
  }

  async deletePost(id: string): Promise<void> {
    const deleted = await this.postRepository.delete(id);
    if (!deleted) throw new NotFoundError(`Post with id '${id}' not found`);
  }
}
```

---

### Step 5: Controller Layer

Create `src/controllers/post.controller.ts`:

```ts
import type { Request, Response } from 'express';
import type { PostService } from '@/services/post.service';
import type { CreatePostDto, ListPostsQuery, PostIdParams, UpdatePostDto } from '@/types/post.dto';
import { sendNoContent, sendSuccess } from '@/utils/http-response';
import { HttpStatus } from '@/utils/http-status';

export class PostController {
  constructor(private readonly postService: PostService) {}

  list = async (req: Request, res: Response) => {
    const query = req.query as unknown as ListPostsQuery;
    const { items, meta } = await this.postService.listPosts(query);
    sendSuccess(res, items, HttpStatus.OK, meta);
  };

  getById = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as PostIdParams;
    const post = await this.postService.getPostById(id);
    sendSuccess(res, post);
  };

  create = async (req: Request, res: Response) => {
    const body = req.body as CreatePostDto;
    const post = await this.postService.createPost(body);
    sendSuccess(res, post, HttpStatus.CREATED);
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as PostIdParams;
    const body = req.body as UpdatePostDto;
    const post = await this.postService.updatePost(id, body);
    sendSuccess(res, post);
  };

  remove = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as PostIdParams;
    await this.postService.deletePost(id);
    sendNoContent(res);
  };
}
```

---

### Step 6: Routes

Create `src/routes/post.routes.ts`:

```ts
import { Router } from 'express';
import type { PostController } from '@/controllers/post.controller';
import { validate } from '@/middlewares';
import {
  createPostBodySchema,
  listPostsQuerySchema,
  postIdParamsSchema,
  updatePostBodySchema,
} from '@/types/post.dto';

export function createPostRouter(controller: PostController): Router {
  const router = Router();

  router.post('/', validate({ body: createPostBodySchema }), controller.create);
  router.get('/', validate({ query: listPostsQuerySchema }), controller.list);
  router.get('/:id', validate({ params: postIdParamsSchema }), controller.getById);
  router.patch(
    '/:id',
    validate({ params: postIdParamsSchema, body: updatePostBodySchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: postIdParamsSchema }), controller.remove);

  return router;
}
```

---

### Step 7: Wire in Composition Root & App Router

1. In `src/container.ts`:

```ts
// Instantiate repo -> service -> controller
const postRepository = new PostRepository(db);
const postService = new PostService(postRepository, userRepository);
const postController = new PostController(postService);
```

2. In `src/routes/index.ts`:

```ts
import { createPostRouter } from '@/routes/post.routes';

export function createApiRouter(container: Container): Router {
  const router = Router();

  router.use('/users', createUserRouter(container.controllers.user));
  router.use('/posts', createPostRouter(container.controllers.post));

  return router;
}
```

---

## Production & Reliability Features

1. **Graceful Shutdown**: Intercepts `SIGINT` / `SIGTERM`, stops accepting new HTTP connections via `server.close()`, closes idle sockets via `server.closeIdleConnections()`, drains the `pg.Pool` database connections, and exits safely within a configurable timeout (`shutdownTimeoutMs`).
2. **Fail-Fast Configuration**: Validates environment variables with Zod at import time. The server will not start with missing or malformed configuration.
3. **Structured Request Logging**: Outputs machine-readable JSON logs in production (`NODE_ENV=production`) and colored human-readable logs in development, including HTTP method, path, status, and precise latency in milliseconds.
4. **Request Tracing**: Assigns a unique UUID to every request via `X-Request-Id` (propagating upstream client headers if provided).
5. **Security Defaults**:
   - `helmet` security headers enabled
   - `x-powered-by` header disabled
   - Strict body parser size limits (`1mb`)
   - `trust proxy` enabled in production for reverse proxies (Nginx, AWS ALB, Cloudflare)
6. **Robust Error Handling**:
   - Centralized handling for all `AppError` subclasses
   - Translates raw PostgreSQL constraint error codes (`23505` Unique Violation, `23503` FK Violation, `22P02` Invalid Syntax) into clean client responses
   - Masks internal server error messages and stack traces from clients in production
