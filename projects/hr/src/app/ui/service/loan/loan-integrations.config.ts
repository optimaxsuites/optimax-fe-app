/**
 * External endpoints used by the loan module, kept in one place instead of inside components.
 *
 * LOAN_MAIL_WEBHOOK_URL is the n8n mail webhook (the same one MailNotificationService uses) for
 * cooperative group invite emails. It is called directly from the browser, so anything it requires
 * (such as an API key) ships to users; moving it behind a backend relay would remove that exposure.
 */
export const LOAN_MAIL_WEBHOOK_URL = 'https://automation.optimaxsuites.com/webhook/735f4d81-3f63-4390-9b03-098be2a31469';
