import { and, eq } from 'drizzle-orm'
import { application, emailTemplate, organization } from '../../../database/schema'
import { applicationIdParamSchema } from '../../../utils/schemas/application'
import { sendRejectionSchema, SYSTEM_TEMPLATES } from '../../../utils/schemas/emailTemplate'
import { sendRejectionEmail, type RejectionEmailData } from '../../../utils/email'

/**
 * POST /api/applications/:id/send-rejection
 * Send a rejection email to the candidate using a system or custom
 * rejection template (or a custom subject/body).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { application: ['update'] })
  const orgId = session.session.activeOrganizationId

  const { id } = await getValidatedRouterParams(event, applicationIdParamSchema.parse)
  const body = await readValidatedBody(event, sendRejectionSchema.parse)

  // Fetch application → candidate + job
  const app = await db.query.application.findFirst({
    where: and(eq(application.id, id), eq(application.organizationId, orgId)),
    with: {
      candidate: true,
      job: { columns: { title: true } },
    },
  })

  if (!app || !app.candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Application or candidate not found' })
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, orgId),
    columns: { name: true },
  })

  if (!org) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' })
  }

  // Resolve template subject and body
  let emailSubject: string
  let emailBody: string

  if (body.templateId) {
    const systemTemplate = SYSTEM_TEMPLATES.find(
      t => t.id === body.templateId && t.category === 'rejection',
    )
    if (systemTemplate) {
      emailSubject = systemTemplate.subject
      emailBody = systemTemplate.body
    } else {
      const customTemplate = await db.query.emailTemplate.findFirst({
        where: and(
          eq(emailTemplate.id, body.templateId),
          eq(emailTemplate.organizationId, orgId),
        ),
      })
      if (!customTemplate) {
        throw createError({ statusCode: 404, statusMessage: 'Email template not found' })
      }
      emailSubject = customTemplate.subject
      emailBody = customTemplate.body
    }
  } else if (body.customSubject && body.customBody) {
    emailSubject = body.customSubject
    emailBody = body.customBody
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Either a template or custom subject/body is required' })
  }

  const candidateName = `${app.candidate.firstName} ${app.candidate.lastName}`

  const emailData: RejectionEmailData = {
    candidateName,
    candidateFirstName: app.candidate.firstName,
    candidateLastName: app.candidate.lastName,
    candidateEmail: app.candidate.email,
    jobTitle: app.job.title,
    organizationName: org.name,
  }

  await sendRejectionEmail({
    subject: emailSubject,
    body: emailBody,
    data: emailData,
  })

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'updated',
    resourceType: 'application',
    resourceId: id,
    metadata: {
      action: 'rejection_email_sent',
      candidateEmail: app.candidate.email,
      templateId: body.templateId ?? 'custom',
    },
  })

  return {
    success: true,
    candidateEmail: app.candidate.email,
  }
})
