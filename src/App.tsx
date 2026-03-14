import ReportForm from './components/ReportForm';

function App() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-300 font-sans flex flex-col items-center p-4 sm:p-8 selection:bg-[#D4FF00] selection:text-black">
      <header className="w-full max-w-3xl pt-10 pb-12 flex flex-col items-center text-center gap-3">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white">
          WATA CHARGEBACKS
        </h1>
        <p className="text-sm sm:text-base font-medium text-zinc-500 uppercase tracking-[0.2em]">
          реестр создания чарджбеков и финцертов
        </p>
      </header>
      
      <main className="w-full max-w-2xl flex-grow mb-12">
        <div className="bg-[#111111] rounded-3xl p-6 sm:p-10 border border-zinc-900 shadow-2xl">
          <ReportForm />
        </div>
      </main>

      <footer className="w-full text-center py-8 mt-auto border-t border-zinc-900">
        <p className="text-xs text-zinc-600 font-medium tracking-widest uppercase">
          © 2026 wata support (Vyacheslav Chuchmanov)
        </p>
      </footer>
    </div>
  );
}

export default App;
