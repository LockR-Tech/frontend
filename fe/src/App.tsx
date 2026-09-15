import './App.css'
import AppRouter from './routes/app-router'
import { Toaster } from '~/components/ui/sonner'

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  )
}

export default App
