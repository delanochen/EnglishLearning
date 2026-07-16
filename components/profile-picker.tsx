import Link from "next/link";

export function ProfilePicker({ profiles, selectedId, pathname }: { profiles: Array<{ id: string; name: string }>; selectedId?: string; pathname: string }) {
  if (!profiles.length) return <div className="card mt-6"><p>还没有可用的学习档案。</p><Link className="button-primary mt-4 inline-block" href="/family">前往家庭页面添加成员</Link></div>;
  return <div className="mt-5 flex flex-wrap gap-2">{profiles.map((profile) => <Link className={profile.id === selectedId ? "button-primary" : "button-ghost"} href={`${pathname}?profile=${profile.id}`} key={profile.id}>{profile.name}</Link>)}</div>;
}
