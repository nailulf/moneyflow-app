import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-lg mb-8">This page is currently a work in progress.</p>
      <Link href="/" className="text-primary hover:underline">
        Go back to Dashboard
      </Link>
    </div>
  )
}