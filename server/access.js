export function isAdmin(user) {
  return Boolean(user && ['primary', 'secondary'].includes(user.role));
}

export function validateLoginAudience(path, user) {
  if (['/api/admin/login', '/api/mobile/admin/login'].includes(path) && !isAdmin(user)) {
    throw new Error('Ce compte est un compte client. Utilisez la connexion client.');
  }
  if (['/api/client/login', '/api/mobile/login'].includes(path) && isAdmin(user)) {
    throw new Error('Ce compte est administrateur. Utilisez l’espace administration.');
  }
}
