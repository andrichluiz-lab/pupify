import { getTeamMembers } from "@/lib/api"
import { EquipeClient } from "./equipe-client"

export default async function EquipePage() {
  const teamMembers = await getTeamMembers()
  return <EquipeClient members={teamMembers} />
}
