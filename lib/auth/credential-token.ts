import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.CREDENTIAL_SECRET || process.env.AUTH_SECRET || 'dev_secret_key_change_in_prod';
const key = new TextEncoder().encode(SECRET_KEY);
const ALG = 'HS256';

export async function generateCredentialToken(personId: string, certificationId?: string, expiresIn: string = '15m'): Promise<string> {
    const jwt = await new SignJWT({ personId, certificationId })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(key);

    return jwt;
}

export async function verifyCredentialToken(token: string): Promise<{ personId: string; certificationId?: string } | null> {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: [ALG],
        });

        if (!payload.personId || typeof payload.personId !== 'string') {
            return null;
        }

        return {
            personId: payload.personId,
            certificationId: typeof payload.certificationId === 'string' ? payload.certificationId : undefined
        };
    } catch (error) {
        // Token inválido o expirado
        return null;
    }
}
