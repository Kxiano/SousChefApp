import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#FAF9F6]">
      <Image 
        src="/logo.png" 
        alt="Sous Chef Kitchen Management" 
        width={500} 
        height={150} 
        className="-mb-8 object-contain relative z-10"
        priority
      />
      <p className="text-lg text-gray-600 mb-8 max-w-xl -mt-6 relative z-20">
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
