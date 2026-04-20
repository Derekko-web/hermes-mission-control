import type { ReactNode } from "react";

import { MissionControlConvexProvider } from "@/components/mission-control/ConvexClientProvider";

export default function MissionControlLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MissionControlConvexProvider>{children}</MissionControlConvexProvider>;
}
