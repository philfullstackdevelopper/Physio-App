import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#155dfc",
          borderRadius: 18,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <rect x="7" y="18" width="4.5" height="7" rx="2.25" fill="#ffffff" />
          <rect x="13.75" y="12" width="4.5" height="13" rx="2.25" fill="#ffffff" />
          <rect x="20.5" y="6" width="4.5" height="19" rx="2.25" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
