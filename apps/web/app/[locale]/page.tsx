import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-6 tracking-tight text-gray-900">Sous Chef</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl">
        The digital co-pilot for restaurant kitchens. Manage inventory, recipes, and your team all in one place.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
          Get Started
        </Link>
      </div>
    </div>
  )
}
