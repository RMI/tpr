import React, {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import NewsletterSignupDialog from "../components/NewsletterSignupDialog";

interface NewsletterSignupContextValue {
  /** Opens the newsletter signup dialog. */
  openSignup: () => void;
}

const NewsletterSignupContext =
  createContext<NewsletterSignupContextValue | null>(null);
NewsletterSignupContext.displayName = "NewsletterSignupContext";

/**
 * Owns the site's one newsletter signup dialog; each call to action only asks
 * it to open.
 *
 * Render it above the routes. The landing page and the inner pages show
 * different CTAs, so a dialog owned by a CTA would unmount, taking the form
 * and whatever had been typed into it, when navigation crossed between them
 * while it was open (browser Back from the landing page, say). Up here the
 * dialog stays mounted across every route.
 */
export const NewsletterSignupProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openSignup = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openSignup }), [openSignup]);

  return (
    <NewsletterSignupContext value={value}>
      {children}
      <NewsletterSignupDialog
        open={open}
        onClose={() => setOpen(false)}
      />
    </NewsletterSignupContext>
  );
};

export function useNewsletterSignup(): NewsletterSignupContextValue {
  const ctx = use(NewsletterSignupContext);
  if (!ctx)
    throw new Error(
      "useNewsletterSignup must be used within a NewsletterSignupProvider",
    );
  return ctx;
}
