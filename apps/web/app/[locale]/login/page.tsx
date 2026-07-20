import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <form className="flex flex-col gap-4 w-full max-w-sm p-8 bg-white shadow-xl rounded-xl">
        <h1 className="text-2xl font-bold mb-4">Sous Chef</h1>
        
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required className="border border-gray-300 p-2 rounded" />
        
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" required className="border border-gray-300 p-2 rounded" />
        
        <div className="flex flex-col gap-2 mt-4">
          <button formAction={login} className="bg-black text-white p-2 rounded hover:bg-gray-800 transition-colors">Log in</button>
          <button formAction={signup} className="bg-gray-200 text-black p-2 rounded hover:bg-gray-300 transition-colors">Sign up</button>
        </div>
      </form>
    </div>
  )
}
