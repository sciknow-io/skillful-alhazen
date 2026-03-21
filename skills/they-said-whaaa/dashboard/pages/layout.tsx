import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'They Said Whaaa? | Skillful-Alhazen',
  description: 'Track public statements, detect contradictions, and build position timelines for politicians and public figures.',
};

export default function TheySaidWhaaaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
