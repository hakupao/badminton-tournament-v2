import { ImageResponse } from "next/og";
import { mdiBadminton } from "@mdi/js";

export const size = {
  width: 512,
  height: 512,
};

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
          borderRadius: 120,
          background: "linear-gradient(135deg, #22c55e 0%, #10b981 55%, #0f766e 100%)",
        }}
      >
        <svg viewBox="0 0 24 24" width="72%" height="72%" aria-hidden="true">
          <path d={mdiBadminton} fill="white" />
        </svg>
      </div>
    ),
    size
  );
}
