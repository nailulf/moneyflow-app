import Sidebar from './sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:block">
        <Sidebar />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}