import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<div className="text-center py-20"><h1 className="text-4xl font-bold mb-4">Welcome to URL Scanner</h1><p className="text-muted-foreground">Select a tool from the sidebar or use the SuperTool search above.</p></div>} />
          {/* We will add routes here later */}
          <Route path="*" element={<div>Coming soon...</div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
