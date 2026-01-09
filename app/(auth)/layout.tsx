export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth routes get no AppLayout - just render children directly
  return <>{children}</>;
}

