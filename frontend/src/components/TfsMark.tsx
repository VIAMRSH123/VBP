/** TFS logo. The source PNG has an opaque white background baked in (no real transparency),
 * which looks like a stray white box on a dark surface if rendered bare. Two ways to handle that:
 *
 * - `transparent={false}` (default): wrap it in the same frosted-glass chip used across the app —
 *   reads as an intentional badge, used wherever the surface behind it doesn't reliably match the
 *   logo's own background (e.g. the login page's left panel, which is always dark regardless of
 *   the site's light/dark toggle).
 * - `transparent={true}`: use a de-whitened version of the same asset (background pixels made
 *   transparent via color decontamination, not just a hard cutout) with no chip at all — just the
 *   green/orange lettering directly on the surface behind it. Pass this only where the caller
 *   knows the background is dark and will actually contrast with the logo's colors.
 *
 * `maxWidth: "none"` overrides Tailwind's preflight `img { max-width: 100% }`, which would
 * otherwise squish the logo's aspect ratio inside a tightly-sized flex container.
 */
export function TfsMark({ size = 40, transparent = false }: { size?: number; transparent?: boolean }) {
  if (transparent) {
    return (
      <img
        src="/tfs-logo-transparent.png"
        alt="TFS — Telangana Food Suncons"
        style={{ height: size, width: "auto", maxWidth: "none" }}
      />
    );
  }

  return (
    <div
      className="glass-panel inline-flex shrink-0 items-center justify-center p-1.5"
      style={{ height: size + 12, borderRadius: 14 }}
    >
      <img
        src="/tfs-logo.png"
        alt="TFS — Telangana Food Suncons"
        style={{ height: size, width: "auto", maxWidth: "none" }}
      />
    </div>
  );
}
