import React, { JSX } from "react";
import { Outlet } from "react-router-dom";

export default function RootLayout(): JSX.Element {
  return (
    <div className="min-h-screen relative">
      <Outlet />
    </div>
  );
}
