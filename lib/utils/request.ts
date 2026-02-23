import { NextRequest } from 'next/server';

/**
 * Safely extracts the client's IP address from a NextRequest.
 * It prioritizes 'x-forwarded-for' header and falls back to request.ip.
 */
export function getClientIp(request: NextRequest): string | null {
    // Try x-forwarded-for header (standard for proxies)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can be a list of IPs, the first one is the client
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback to NextRequest.ip (supported on Vercel and similar)
    // Cast to any to handle environments where the type might not include it
    return (request as any).ip || null;
}
