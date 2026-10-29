import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import KarakeepLogo from "@/components/KarakeepIcon";
import { getServerAuthSession } from "@/server/auth";

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header className="keeply-header sticky top-0 z-40 flex h-16 w-full items-center gap-4 bg-background px-4 sm:px-6">
      <div className="hidden items-center sm:flex">
        <Link href={"/dashboard/bookmarks"} className="w-[192px] shrink-0">
          <KarakeepLogo height={38} />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 gap-2">
        <SearchInput className="keeply-search rounded-full bg-card" />
      </div>
      <div className="flex items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
