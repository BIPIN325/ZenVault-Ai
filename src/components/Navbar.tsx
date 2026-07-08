import Image from 'next/image';

interface NavbarProps {
  activeView?: string;
  onNavigate?: (view: string) => void;
}

export default function Navbar({ activeView, onNavigate }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-green-500/20 shadow-sm sticky top-0 z-50">
      <div 
        onClick={() => onNavigate?.('repository')} 
        className="flex items-center gap-3 group cursor-pointer"
      >
        <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
          <Image 
            src="/favicon-96x96.png" 
            alt="ZenVault AI Logo" 
            fill
            className="object-contain drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
            priority
          />
        </div>
        <span className="text-xl font-bold tracking-[0.15em] text-green-400 group-hover:text-green-300 transition-colors">
          ZENVAULT
        </span>
      </div>
      
      <div className="hidden md:flex gap-6 items-center text-sm font-medium text-gray-400">
        <button 
          onClick={() => onNavigate?.('repository')} 
          className={`hover:text-green-400 transition-colors ${activeView === 'repository' ? 'text-green-400' : ''}`}
        >
          My Vault
        </button>
        <button 
          onClick={() => onNavigate?.('keys')} 
          className={`hover:text-green-400 transition-colors ${activeView === 'keys' ? 'text-green-400' : ''}`}
        >
          Settings
        </button>
      </div>
    </nav>
  );
}
