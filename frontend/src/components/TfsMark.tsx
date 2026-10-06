import { useTheme } from "../hooks/useTheme";

/** TFS logo. The source PNG has a baked-in white background, so it is rendered as a multiply-blended
 * image on light surfaces (the white disappears) and swapped for the de-whitened asset on dark ones.
 * `maxWidth: none` overrides Tailwind preflight's `img { max-width: 100% }`, which would otherwise
 * squash the aspect ratio inside a tightly-sized flex container. */
export function TfsMark({ size = 28 }: { size?: number }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <img
      src={dark ? "/tfs-logo-transparent.png" : "/tfs-logo.png"}
      alt="TFS — Telangana Food Suncons"
      style={{ height: size, width: "auto", maxWidth: "none", mixBlendMode: dark ? "normal" : "multiply" }}
    />
  );
}
