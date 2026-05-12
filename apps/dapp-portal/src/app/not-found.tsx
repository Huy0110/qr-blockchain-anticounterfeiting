import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <div className="container-narrow flex min-h-screen flex-col items-center justify-center gap-4 py-10">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground">Trang không tồn tại / Page not found.</p>
      <Link href="/" className="text-primary underline">
        Quay lại / Go home
      </Link>
    </div>
  );
}
