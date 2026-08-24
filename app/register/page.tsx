import { RegisterForm } from "@/components/register-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto py-10">
      <RegisterForm />
    </div>
  );
}