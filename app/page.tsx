export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Allo Inventory System</h1>
        <p className="text-lg text-gray-600 mb-4">
          Welcome to the inventory reservation system. Browse products and make reservations.
        </p>
        <a
          href="/products"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          View Products
        </a>
      </div>
    </main>
  );
}
