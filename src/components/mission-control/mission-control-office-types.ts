export type PixelOfficeAgent = {
  id: number;
  memberId: string;
  name: string;
  roleTitle: string;
  statusLabel: string;
  activity: string;
  activeTool: string;
  isActive: boolean;
};

export type OfficeActivityItem = {
  id: string;
  memberName: string;
  detail: string;
  meta: string;
  tone: "amber" | "emerald" | "cyan" | "violet" | "rose" | "indigo" | "zinc";
};
