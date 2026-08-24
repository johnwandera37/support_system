import { LoginForm } from "@/components/login-form"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
// export const instant = false;

export default function Home() {
  // In a real app, you would check if the user is already authenticated
  // and redirect them to the appropriate dashboard
  // For demo purposes, we'll just show the login form

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Smart Support</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to access your support dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
