import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamSettingsClient } from "@/app/settings/team/team-settings-client";

export default async function TeamSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "OWNER") {
    redirect("/");
  }

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <h1 className="synapse-heading">Team</h1>
      <TeamSettingsClient />
    </div>
  );
}
