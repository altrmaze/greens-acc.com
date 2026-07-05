export function verifyIdentity(req, res, next) {
  const userId = req.header('x-user-id') || req.body?.user_id;
  const verifiedHeader = req.header('x-user-verified');
  const verifiedBody = req.body?.identity_verified;

  const identityVerified =
    verifiedHeader === 'true' ||
    verifiedHeader === '1' ||
    verifiedBody === true;

  if (!userId) {
    return res.status(401).json({ error: 'Missing user identity' });
  }

  req.identity = {
    userId,
    verified: identityVerified
  };

  return next();
}
