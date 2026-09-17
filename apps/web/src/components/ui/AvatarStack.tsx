import { getInitials, avatarColor } from '@/lib/utils';

interface Person {
  id: string;
  firstName: string;
  lastName?: string | null;
}

export function AvatarStack({ people, max = 3 }: { people: Person[]; max?: number }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p) => (
        <div
          key={p.id}
          title={`${p.firstName} ${p.lastName ?? ''}`.trim()}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white ${avatarColor(p.id)}`}
        >
          {getInitials(`${p.firstName} ${p.lastName ?? ''}`)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}
