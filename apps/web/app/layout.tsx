// Since we have a root middleware that redirects to the locale-prefixed path,
// this layout is required by Next.js but will only serve to pass children through.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
