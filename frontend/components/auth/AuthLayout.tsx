import Image from "next/image";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex justify-center">
          <Image src="/logo.svg" alt="Slid to-do" width={180} height={40} />
        </Link>
        {children}
      </div>
    </div>
  );
}
