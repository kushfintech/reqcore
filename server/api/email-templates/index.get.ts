import { and, eq } from 'drizzle-orm'
import { emailTemplate } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { emailTemplate: ['read'] })
  const orgId = session.session.activeOrganizationId

  // Optional ?category=interview|rejection filter
  const { category } = getQuery(event)
  const validCategory = category === 'interview' || category === 'rejection' ? category : undefined

  const templates = await db.query.emailTemplate.findMany({
    where: validCategory
      ? and(eq(emailTemplate.organizationId, orgId), eq(emailTemplate.category, validCategory))
      : eq(emailTemplate.organizationId, orgId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  return templates
})
