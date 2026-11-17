import crypto from 'node:crypto';

function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.from(str, 'utf8').toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signToken(payload, secret, options = {}) {
  if (!secret) {
    throw new Error('JWT secret is required');
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Number(options.expiresIn ?? process.env.JWT_EXPIRES_IN ?? 3600);
  const issuer = options.issuer ?? process.env.JWT_ISSUER;
  const audience = options.audience ?? process.env.JWT_AUDIENCE;

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    jti: crypto.randomUUID(),
  };

  if (issuer) fullPayload.iss = issuer;
  if (audience) fullPayload.aud = audience;

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(fullPayload);
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

export function verifyToken(token, secret, options = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token não fornecido ou em formato inválido');
  }
  if (!secret) {
    throw new Error('JWT secret is required');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de token inválido');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  let header;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
  } catch {
    throw new Error('Header do token inválido');
  }

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Algoritmo ou tipo de token não suportado');
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Assinatura do token inválida');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Payload do token inválido');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) {
    throw new Error('Token expirado');
  }

  const expectedIssuer = options.issuer ?? process.env.JWT_ISSUER;
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    throw new Error('Emissor (iss) do token inválido');
  }

  const expectedAudience = options.audience ?? process.env.JWT_AUDIENCE;
  if (expectedAudience && payload.aud !== expectedAudience) {
    throw new Error('Audiência (aud) do token inválida');
  }

  return payload;
}
