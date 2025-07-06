# Support Ticketing System

A full-stack support ticketing system with Next.js, Prisma, Redis, and JWT authentication. This system includes role-based access control, real-time ticket updates with Socket.IO, and a comprehensive API for ticket management.

## Features Implemented

### Authentication & Sessions
- JWT authentication with access and refresh tokens
- Redis session management for multiple device support
- Role-based authorization (User, Agent, Admin)
- Secure password hashing and comparison
- Cookie-based token storage

### Ticketing System
- CRUD operations for tickets with role-based access:
  - Users: Create/view their own tickets
  - Agents/Admins: View/update all tickets
- Real-time updates via Socket.IO
- Enhanced ticket assignment logic:
  - Agents can assign tickets to themselves
  - Assignment history tracking
  - Escalation workflow with required comments
  - Status-based restrictions (pending, resolved, closed)

### Comments System
- Create, update, and delete comments on tickets
- User attribution for all comments

### Admin Features
- User management (promote/demote/approve)
- Department management
- Default admin account initialization
- Force password update for default admin

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database
- Redis server
- Environment variables (copy `.env.example` to `.env` and fill in values)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
3. Run database migrations 
   npx prisma migrate dev
4. Initialize default admin account
   npm run init
5. Default admin credentials: 
   Email: admin@example.com
   Password: admin
6. Running the Application
   npm run dev
7. Other Scripts
   npm run init: Initialize default admin account
   npm run cleanup:test: Clean test data from database
   npm run shutdownredis: Manually shutdown Redis connection

### API Documentation
http://localhost:3000/api-docs


<!-- 
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. -->
