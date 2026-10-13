export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:7213',
  // The workspace (tenant app) address. The sign-up form shows the domain; "Find your workspace" on
  // the sign-in page sends agents to the pattern with {slug} filled in. Addresses returned by the API
  // (sign-up, account area) come from AppSettings:BaseDomain / Billing:TenantAppUrl instead.
  workspaceDomain: 'centerdesk.io',
  // The tenant app's dev server (ng serve on 4200) — run the admin app on another port, e.g. 4300.
  workspaceUrlPattern: 'http://{slug}.localhost:4200',
};
