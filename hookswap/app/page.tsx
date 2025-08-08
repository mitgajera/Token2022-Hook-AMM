import { ClientSideComponents } from '@/components/ClientWrapper';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <ClientSideComponents />
    </main>
  );
}