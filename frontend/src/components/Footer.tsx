export default function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto max-w-6xl px-4 text-xs text-neutral-600">
        © {new Date().getFullYear()} Clothing Store. All rights reserved.
      </div>
    </footer>
  );
}

