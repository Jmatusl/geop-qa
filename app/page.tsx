import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/session';

export default async function HomePage() {
    const session = await verifySession();

    if (session) {
        redirect('/dashboard');
    } else {
        redirect('/login');
    }
}
