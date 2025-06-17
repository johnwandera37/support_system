//This script initializes a default Admin user that will be used for first time login
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/hash";

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        name: "Default Admin",
        email: "admin@example.com",
        password: await hashPassword("admin"),
        role: "ADMIN",
        adminProfile: {
          create: {
            level: 1, // You can set this to whatever you want for the default admin
          },
        },
      },
      include: {
        adminProfile: true, // Optional: if you want to confirm it's added
      },
    });

    console.log("✅ Default admin created: admin@example.com / admin");
  } else {
    console.log("✅ Admin already exists. Skipping seed.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
