// Single source of truth for HTTP routes: used by infra (api-stack) and the local dev server.
// `fn` is the handler path under src/handlers (without .ts). `auth: true` routes need the __Host-ps_at cookie;
// the handler wrapper verifies it (API Gateway has no authorizer).
export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  fn: string;
  auth: boolean;
}

export const ROUTES: Route[] = [
  // Cookie auth (docs/AUTH.md). `auth: false`: these routes run before there is a session.
  { method: 'POST', path: '/auth/signup', fn: 'auth/signup', auth: false },
  { method: 'POST', path: '/auth/confirm', fn: 'auth/confirm', auth: false },
  { method: 'POST', path: '/auth/resend', fn: 'auth/resend', auth: false },
  { method: 'POST', path: '/auth/login', fn: 'auth/login', auth: false },
  { method: 'POST', path: '/auth/admin/login', fn: 'auth/adminLogin', auth: false },
  { method: 'POST', path: '/auth/mfa', fn: 'auth/mfa', auth: false },
  { method: 'POST', path: '/auth/refresh', fn: 'auth/refresh', auth: false },
  { method: 'POST', path: '/auth/logout', fn: 'auth/logout', auth: false },
  { method: 'POST', path: '/auth/forgot', fn: 'auth/forgot', auth: false },
  { method: 'POST', path: '/auth/reset', fn: 'auth/reset', auth: false },
  { method: 'GET', path: '/listings', fn: 'listings/list', auth: false },
  { method: 'GET', path: '/listings/{id}', fn: 'listings/get', auth: false },
  { method: 'POST', path: '/listings', fn: 'listings/create', auth: true },
  { method: 'PUT', path: '/listings/{id}', fn: 'listings/update', auth: true },
  { method: 'DELETE', path: '/listings/{id}', fn: 'listings/delete', auth: true },
  { method: 'GET', path: '/me/listings', fn: 'listings/mine', auth: true },
  { method: 'POST', path: '/uploads/presign', fn: 'uploads/presign', auth: true },
  { method: 'GET', path: '/price-band', fn: 'pricing/band', auth: false },
  { method: 'POST', path: '/listings/{id}/offers', fn: 'offers/create', auth: true },
  { method: 'GET', path: '/listings/{id}/offers', fn: 'offers/forListing', auth: true },
  { method: 'PATCH', path: '/listings/{id}/offers/{offerId}', fn: 'offers/update', auth: true },
  { method: 'GET', path: '/me/offers', fn: 'offers/mine', auth: true },
  { method: 'GET', path: '/me/orders', fn: 'orders/mine', auth: true },
  { method: 'GET', path: '/orders/{id}', fn: 'orders/get', auth: true },
  { method: 'POST', path: '/orders/{id}/pay', fn: 'orders/pay', auth: true },
  { method: 'POST', path: '/orders/{id}/cancel', fn: 'orders/cancel', auth: true },
  { method: 'GET', path: '/jobs', fn: 'jobs/list', auth: true },
  { method: 'POST', path: '/jobs/{orderId}/claim', fn: 'jobs/claim', auth: true },
  { method: 'PATCH', path: '/jobs/{orderId}/status', fn: 'jobs/updateStatus', auth: true },
  { method: 'GET', path: '/impact', fn: 'impact/get', auth: false },
  { method: 'GET', path: '/me', fn: 'users/getMe', auth: true },
  { method: 'PUT', path: '/me', fn: 'users/updateMe', auth: true },
  { method: 'GET', path: '/admin/users', fn: 'admin/listUsers', auth: true },
  { method: 'PATCH', path: '/admin/users/{id}', fn: 'admin/verifyUser', auth: true },
  { method: 'GET', path: '/admin/listings', fn: 'admin/listListings', auth: true },
  { method: 'PATCH', path: '/admin/listings/{id}', fn: 'admin/reviewListing', auth: true },
  { method: 'GET', path: '/admin/orders', fn: 'admin/listOrders', auth: true },
  { method: 'POST', path: '/support', fn: 'support/send', auth: true },
  { method: 'POST', path: '/ai/chat', fn: 'ai/chat', auth: true },
  { method: 'POST', path: '/tts', fn: 'ai/tts', auth: true },
];
