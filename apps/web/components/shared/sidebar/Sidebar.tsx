import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import serverConfig from "@karakeep/shared/config";

import SidebarItem from "./SidebarItem";
import SidebarVersion from "./SidebarVersion";
import { TSidebarItem } from "./TSidebarItem";

export default async function Sidebar({
  items,
  extraSections,
}: {
  items: (t: TFunction) => TSidebarItem[];
  extraSections?: React.ReactNode;
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();

  return (
    <aside className="keeply-sidebar flex h-[calc(100dvh-64px)] w-[232px] flex-col gap-6 px-4 pb-4 pt-6">
      <div>
        <ul className="space-y-1 text-sm">
          {items(t).map((item) => (
            <SidebarItem
              key={item.name}
              logo={item.icon}
              name={item.name}
              path={item.path}
            />
          ))}
        </ul>
      </div>
      {extraSections}
      <SidebarVersion
        serverVersion={serverConfig.serverVersion}
        changeLogVersion={serverConfig.changelogVersion}
      />
    </aside>
  );
}
