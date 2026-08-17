export interface SystemTemplate {
  id: string
  name: string
  description: string
  subject: string
  body: string
  /** Which flow this template belongs to. Omitted = interview (back-compat). */
  category?: 'interview' | 'rejection'
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'system-standard',
    name: 'Standard Interview Invitation',
    description: 'A professional and formal invitation suitable for most interview types.',
    subject: 'Interview Invitation: {{jobTitle}} at {{organizationName}}',
    body: `Dear {{candidateName}},

We are pleased to invite you to an interview for the {{jobTitle}} position at {{organizationName}}.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Duration: {{interviewDuration}} minutes
- Type: {{interviewType}}
- Location: {{interviewLocation}}

Interviewers: {{interviewers}}

Please confirm your availability by replying to this email. If you need to reschedule, let us know as soon as possible.

We look forward to speaking with you!

Best regards,
{{organizationName}}`,
  },
  {
    id: 'system-friendly',
    name: 'Friendly & Casual',
    description: 'A warm, conversational tone that puts candidates at ease.',
    subject: "Let's chat! Interview for {{jobTitle}}",
    body: `Hi {{candidateFirstName}},

Great news — we'd love to meet you for the {{jobTitle}} role at {{organizationName}}!

Here are the details:
- When: {{interviewDate}} at {{interviewTime}} ({{interviewDuration}} min)
- How: {{interviewType}}
- Where: {{interviewLocation}}

You'll be speaking with: {{interviewers}}

If this time doesn't work for you, just let us know and we'll find something that does.

Looking forward to it!

The {{organizationName}} Team`,
  },
  {
    id: 'system-technical',
    name: 'Technical Interview',
    description: 'Tailored for technical interviews with preparation tips for candidates.',
    subject: 'Technical Interview: {{jobTitle}} — {{organizationName}}',
    body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{organizationName}}. We'd like to invite you to a technical interview.

Interview Details:
- Title: {{interviewTitle}}
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Duration: {{interviewDuration}} minutes
- Format: {{interviewType}}
- Location: {{interviewLocation}}

Your interviewer(s): {{interviewers}}

To help you prepare:
- Be ready to discuss your technical experience and problem-solving approach
- You may be asked to write or review code during the session
- Feel free to ask questions about our tech stack and development practices

Please confirm your attendance by replying to this email.

Best regards,
{{organizationName}}`,
  },
  {
    id: 'system-rejection-standard',
    name: 'Standard Rejection',
    description: 'A professional, respectful decline suitable for most situations.',
    category: 'rejection',
    subject: 'Update on your application for {{jobTitle}}',
    body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{organizationName}} and for taking the time to apply.

After careful consideration, we have decided not to move forward with your application at this time. This was a difficult decision, as we received many strong applications.

We genuinely appreciate the effort you put into your application and encourage you to apply for future openings that match your experience.

We wish you all the best in your job search.

Best regards,
{{organizationName}}`,
  },
  {
    id: 'system-rejection-warm',
    name: 'Warm & Encouraging',
    description: 'A kind, personable decline that leaves the door open.',
    category: 'rejection',
    subject: 'Thank you for applying to {{jobTitle}}',
    body: `Hi {{candidateFirstName}},

Thank you so much for your interest in the {{jobTitle}} role at {{organizationName}} — it was a pleasure learning about your background.

After thoughtful review, we've decided to proceed with other candidates whose experience more closely matched what we need for this particular role. Please know this is not a reflection of your abilities.

We'd love to stay in touch and hope you'll consider applying again as our team grows.

Warm regards,
The {{organizationName}} Team`,
  },
  {
    id: 'system-rejection-post-interview',
    name: 'After Interview',
    description: 'For candidates you interviewed but are not moving forward with.',
    category: 'rejection',
    subject: 'Regarding your interview for {{jobTitle}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{organizationName}}. We enjoyed getting to know you and learning more about your experience.

After careful consideration, we have decided to move forward with another candidate for this role. This decision was not easy given the caliber of candidates we spoke with.

We were genuinely impressed by you and would welcome the opportunity to consider you for future roles that fit your skills.

Thank you again, and we wish you continued success.

Best regards,
{{organizationName}}`,
  },
]
