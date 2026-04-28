import { Link } from "wouter";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50 px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-sm text-neutral-700 font-semibold">
            NearBuy &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Le commerce de proximité, à portée de main.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/supprimer-compte"
            className="text-neutral-700 hover:text-orange-600 underline-offset-4 hover:underline"
            data-testid="footer-link-delete-account"
          >
            Demander la suppression de mon compte
          </Link>
          <a
            href="mailto:support@nearbuy.app"
            className="text-neutral-700 hover:text-orange-600"
          >
            Contact support
          </a>
        </nav>
      </div>
    </footer>
  );
}
