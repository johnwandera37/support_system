import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };//check if prisma exists globally

const prisma = globalForPrisma.prisma ?? new PrismaClient();//ensure one instance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;//Store Prisma in the global scope (only in dev) Prevents multiple instances of 
// PrismaClient during development due to hot reload, initialized once in production

export default prisma; 
