export default function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
    </div>
  )
}