import { notFound } from 'next/navigation'
import { getUserPermissions } from '@/lib/api'
import { PermissionsEditor } from './permissions-editor'
import { AppTopbar } from '@/components/app-topbar'

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function UserPermissionsPage({ params }: PageProps) {
  const { userId } = await params

  // `userId` in the URL is actually the UserTenant.id (the team-page list
  // returns those as `id`). Backend treats the param as userTenantId.
  let data
  try {
    data = await getUserPermissions(userId)
  } catch {
    notFound()
  }

  return (
    <>
      <AppTopbar
        title={`Permissões de ${data.userTenant.user.name}`}
        description={`Role: ${data.userTenant.role} • ${data.userTenant.user.email}`}
      />
      <main className="p-4 md:p-6">
        <PermissionsEditor data={data} />
      </main>
    </>
  )
}
