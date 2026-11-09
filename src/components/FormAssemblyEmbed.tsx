import React, { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Floor for heights the form reports. The form's helper measures its own
 * page, and a 0 or near-0 reading (say, mid-navigation after submit) would
 * otherwise collapse the iframe to nothing.
 */
export const MIN_FORM_HEIGHT = 150;

type FormAssemblyEmbedProps = {
  /** Published form URL, e.g. `https://rmi.tfaforms.net/312`. */
  formUrl: string;
  /** Accessible name for the iframe. */
  title: string;
  /** Height before the form reports its own, in pixels. */
  initialHeight?: number;
  /**
   * Called when the form moves to a new page (it was submitted, or a
   * multi-page form changed page), so the container can bring its top back
   * into view. Without it the iframe is scrolled into view, as FormAssembly's
   * own helper does; a container that scrolls by itself, such as a dialog,
   * usually knows better.
   */
  onFormNavigate?: () => void;
};

/**
 * Embeds a FormAssembly (TFA) form in an iframe that grows to fit it.
 *
 * FormAssembly's own embed is the iframe plus their `iframe_resize_helper.js`.
 * That script scans the page for iframes once, when it loads, and rewrites
 * their `src`. That suits a static page, but not an iframe React mounts later
 * (here, when a dialog opens). So this component does the helper's job itself:
 *
 * - It adds `faIframeUniqueId` and `hostURL` to the form URL. The form only
 *   posts its height to the parent when both are present.
 * - It listens for those posts, `"<height|command>,<id>,<form url>"`, from the
 *   form's origin only, and applies the height to this iframe.
 * - It calls `onFormNavigate` when the form moves to another page. Each
 *   iframe `load` after the first one means that (the submit's confirmation
 *   page, say). The form's own `submitted` post can't be relied on for this:
 *   it is sent from an `unload` handler, which Chrome is phasing out.
 *   `pagechange` (multi-page forms, no load) is still handled.
 *
 * The form host sends `frame-ancestors 'self' https:`, so the form does not
 * render on an `http://localhost` dev server, only on https deployments.
 */
const FormAssemblyEmbed: React.FC<FormAssemblyEmbedProps> = ({
  formUrl,
  title,
  initialHeight = 700,
  onFormNavigate,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);
  const uniqueId = useId().replace(/[^A-Za-z0-9]/g, "");
  const formOrigin = new URL(formUrl).origin;

  // Built once, at mount. Rebuilding it on each render would follow the page
  // URL, and a route change while the form is open (browser Back, say) would
  // then reload the iframe and wipe whatever had been typed.
  const [src] = useState(() => {
    // Page URL without query or hash: the form uses it as its postMessage
    // target, so the origin is what matters; there is no need to send TFA
    // anything more.
    const hostUrl = window.location.origin + window.location.pathname;
    const separator = formUrl.includes("?") ? "&" : "?";
    return (
      `${formUrl}${separator}faIframeUniqueId=${uniqueId}` +
      `&hostURL=${encodeURIComponent(hostUrl)}`
    );
  });

  // Latest callback, read from the message listener without re-subscribing it
  // whenever a parent passes a new inline function.
  const onFormNavigateRef = useRef(onFormNavigate);
  useEffect(() => {
    onFormNavigateRef.current = onFormNavigate;
  });

  const handleFormNavigate = useCallback(() => {
    if (onFormNavigateRef.current) {
      onFormNavigateRef.current();
    } else {
      iframeRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);

  // The first load is the form itself; any later one is a new page.
  const loadCount = useRef(0);
  const handleLoad = () => {
    loadCount.current += 1;
    if (loadCount.current > 1) handleFormNavigate();
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== formOrigin || typeof event.data !== "string") {
        return;
      }
      const [heightOrCommand, messageId] = event.data.split(",");
      if (messageId !== uniqueId) return;

      const newHeight = Number(heightOrCommand);
      if (heightOrCommand !== "" && Number.isFinite(newHeight)) {
        setHeight(Math.max(MIN_FORM_HEIGHT, Math.round(newHeight)));
      } else if (
        heightOrCommand === "submitted" ||
        heightOrCommand === "pagechange"
      ) {
        handleFormNavigate();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [formOrigin, uniqueId, handleFormNavigate]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      src={src}
      height={height}
      onLoad={handleLoad}
      className="block w-full border-0"
    />
  );
};

export default FormAssemblyEmbed;
