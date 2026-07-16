import { ImageResponse } from "next/og";

export const alt = "Hoodwire — the financial routing layer for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const layer = (backgroundImage: string) => ({
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  backgroundImage,
});

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0B0E0C",
        }}
      >
        <div style={layer("radial-gradient(circle at 22% 32%, rgba(33,80,38,0.9), transparent 55%)")} />
        <div style={layer("radial-gradient(circle at 72% 68%, rgba(25,62,32,0.75), transparent 52%)")} />
        <div style={layer("radial-gradient(circle at 52% 52%, rgba(46,104,45,0.45), transparent 42%)")} />
        <div style={layer("radial-gradient(120% 70% at 50% 0%, rgba(198,245,62,0.16), transparent 62%)")} />
        <div style={layer("radial-gradient(85% 80% at 50% 58%, transparent 38%, rgba(11,14,12,0.9))")} />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 72,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 80, borderRadius: 14, background: "#C6F53E", display: "flex" }} />
              <div style={{ width: 38, height: 80, borderRadius: 14, background: "#C6F53E", marginLeft: 3, marginTop: 11, display: "flex" }} />
            </div>
            <div style={{ marginLeft: 24, fontSize: 44, color: "#EDEFEA", letterSpacing: -1 }}>hoodwire</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 68, color: "#EDEFEA", letterSpacing: -2, lineHeight: 1.1 }}>
              The financial routing layer
            </div>
            <div style={{ display: "flex", fontSize: 68, color: "#C6F53E", letterSpacing: -2, lineHeight: 1.1, marginTop: 6 }}>
              for AI agents.
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "#8A9484", marginTop: 28 }}>
              One MCP connection · settled in USDG on Robinhood Chain
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: "#C6F53E" }} />
            <div style={{ display: "flex", marginLeft: 12, fontSize: 24, color: "#8A9484" }}>
              hoodwire.xyz · live on Robinhood Chain testnet
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
