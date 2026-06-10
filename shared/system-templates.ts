export interface SystemTemplate {
  id: string
  /** Which workflow this template belongs to. */
  category: 'interview' | 'rejection'
  name: string
  description: string
  subject: string
  body: string
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'system-standard',
    category: 'interview',
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
    category: 'interview',
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
    category: 'interview',
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

  // ─── Rejection templates ──────────────────────────────────────────
  {
    id: 'system-rejection-standard',
    category: 'rejection',
    name: 'Standard Rejection',
    description: 'A polite, professional decline suitable for most situations.',
    subject: 'Update on your application for {{jobTitle}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to apply for the {{jobTitle}} position at {{organizationName}} and for sharing your background with us.

After careful consideration, we have decided not to move forward with your application at this time. This was a difficult decision, as we received many strong applications.

We genuinely appreciate your interest in {{organizationName}} and encourage you to apply for future roles that match your skills and experience.

We wish you all the best in your job search.

Kind regards,
{{organizationName}}`,
  },
  {
    id: 'system-rejection-warm',
    category: 'rejection',
    name: 'Warm & Encouraging',
    description: 'A friendly tone that keeps the door open for future opportunities.',
    subject: 'Thank you for applying to {{organizationName}}',
    body: `Hi {{candidateFirstName}},

Thank you so much for your interest in the {{jobTitle}} role and for the time you invested in your application.

While we won't be moving forward on this occasion, it was a close call and we were genuinely impressed by you. We'd love to stay in touch — please don't hesitate to apply again as new opportunities open up at {{organizationName}}.

Wishing you the very best, and we hope our paths cross again.

Warm regards,
The {{organizationName}} Team`,
  },
  {
    id: 'system-rejection-post-interview',
    category: 'rejection',
    name: 'After Interview',
    description: 'For candidates who interviewed — acknowledges their time and effort.',
    subject: 'Your interview for {{jobTitle}} at {{organizationName}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{organizationName}}. It was a pleasure getting to know you and learning more about your experience.

After careful consideration, we have decided to move forward with another candidate whose background more closely matches our current needs. This was not an easy decision given the quality of candidates we met.

We were impressed by you and would welcome the opportunity to consider you for future openings. Please feel free to stay in touch.

Thank you again, and we wish you success in your career.

Best regards,
{{organizationName}}`,
  },
]
