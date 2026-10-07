export type Member = { userId: string; name: string };

const MAX_SHOWN = 5;

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] ?? "" : "";

  return (first + last).toUpperCase();
}

export function PresenceAvatars({ members }: { members: Member[] }) {
  const shown = members.slice(0, MAX_SHOWN);
  const extra = members.length - shown.length;

  return (
    <ul aria-label={`${members.length} in this room`} className="flex items-center -space-x-2">
      {shown.map((member) => (
        <li
          key={member.userId}
          title={member.name}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel bg-elevated font-mono text-xs font-medium text-ink"
        >
          <span aria-hidden="true">{initialsOf(member.name)}</span>
          <span className="sr-only">{member.name}</span>
        </li>
      ))}
      {extra > 0 && (
        <li
          title={`${extra} more`}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel bg-elevated font-mono text-xs text-ink-dim"
        >
          +{extra}
        </li>
      )}
    </ul>
  );
}