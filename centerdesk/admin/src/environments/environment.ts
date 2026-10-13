export const environment = {
  production: true,
  apiBaseUrl: 'https://localhost:7213',
  // The workspace (tenant app) address. The sign-up form shows the domain; "Find your workspace" on
  // the sign-in page sends agents to the pattern with {slug} filled in. Addresses returned by the API
  // (sign-up, account area) come from AppSettings:BaseDomain / Billing:TenantAppUrl instead.
  workspaceDomain: 'centerdesk.io',
  workspaceUrlPattern: 'https://{slug}.centerdesk.io',
};
