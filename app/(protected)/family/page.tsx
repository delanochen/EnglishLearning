import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { archiveMember, createFamily, createMember, restoreMember, updateFamily, updateMember } from "@/modules/family/actions";

const dailyOptions = [10, 15, 20, 30, 45, 60];

export default async function FamilyPage() {
  const session = await auth();
  const ctx = await getAccessContext(session!.user.id);
  const families = await db.family.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerUserId: session!.user.id }, { members: { some: { userId: session!.user.id, deletedAt: null } } }]
    },
    include: {
      members: { include: { learnerProfile: true }, orderBy: { createdAt: "asc" } }
    }
  });

  return <div className="mx-auto max-w-6xl">
    <h1 className="text-4xl font-black">家庭与成员</h1>
    <p className="mt-2 text-muted">家庭数据仅对有权限的成员开放。</p>

    {!families.length && <form action={createFamily} className="card mt-8 max-w-xl">
      <h2 className="text-xl font-bold">创建第一个家庭</h2>
      <label className="mt-5 block"><span className="label">家庭名称</span><input className="input" name="name" required defaultValue="我的家庭" /></label>
      <label className="mt-4 block"><span className="label">时区</span><input className="input" name="timezone" required defaultValue="America/Chicago" /></label>
      <button className="button-primary mt-5">创建家庭</button>
    </form>}

    <div className="mt-8 space-y-6">{families.map((family) => {
      const manageable = canManageFamily(ctx, family.id);
      return <section className="card" key={family.id}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-2xl font-bold">{family.name}</h2><p className="text-sm text-muted">{family.timezone} · {family.members.filter((member) => !member.deletedAt).length} 位成员</p></div>
        </div>

        {manageable && <details className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <summary className="cursor-pointer font-semibold text-brand">修改家庭信息</summary>
          <form action={updateFamily} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="familyId" value={family.id} />
            <label><span className="label">家庭名称</span><input className="input" name="name" required defaultValue={family.name} /></label>
            <label><span className="label">时区</span><input className="input" name="timezone" required defaultValue={family.timezone} /></label>
            <div className="flex items-end"><button className="button-primary">保存家庭信息</button></div>
          </form>
        </details>}

        <div className="mt-6 grid gap-3 md:grid-cols-2">{family.members.filter((member) => !member.deletedAt).map((member) => <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" key={member.id}>
          <strong>{member.displayName}</strong>{member.nickname && <span className="ml-2 text-muted">({member.nickname})</span>}
          <p className="mt-1 text-sm text-muted">{member.memberType} · {member.learnerProfile ? `${member.learnerProfile.dailyMinutes} 分钟/天` : "管理成员"}</p>

          {manageable && <details className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <summary className="cursor-pointer font-semibold text-brand">修改成员信息</summary>
            <form action={updateMember} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="memberId" value={member.id} />
              <label><span className="label">姓名</span><input className="input" name="displayName" required defaultValue={member.displayName} /></label>
              <label><span className="label">昵称</span><input className="input" name="nickname" defaultValue={member.nickname ?? ""} /></label>
              {member.memberType === "OWNER"
                ? <><input type="hidden" name="memberType" value="OWNER" /><p className="self-end rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">身份：家庭所有者（不可更改）</p></>
                : <label><span className="label">身份</span><select className="input" name="memberType" defaultValue={member.memberType}><option value="PARENT">家长</option><option value="LEARNER">普通成员</option><option value="CHILD">学生/儿童</option></select></label>}
              {member.learnerProfile && <>
                <label><span className="label">年龄段</span><select className="input" name="ageBand" defaultValue={member.learnerProfile.ageBand}><option value="CHILD">儿童</option><option value="TEEN">青少年</option><option value="ADULT">成人</option><option value="SENIOR">长者</option></select></label>
                <label><span className="label">每日学习时间</span><select className="input" name="dailyMinutes" defaultValue={member.learnerProfile.dailyMinutes}>{dailyOptions.map((value) => <option value={value} key={value}>{value} 分钟</option>)}</select></label>
                <label><span className="label">学习目标（逗号分隔）</span><input className="input" name="goals" defaultValue={member.learnerProfile.goals.join("，")}/></label>
                <label><span className="label">兴趣主题（逗号分隔）</span><input className="input" name="interests" defaultValue={member.learnerProfile.interests.join("，")}/></label>
                <label><span className="label">薄弱项目（逗号分隔）</span><input className="input" name="weakAreas" defaultValue={member.learnerProfile.weakAreas.join("，")}/></label>
              </>}
              <div className="flex items-end"><button className="button-primary w-full">保存修改</button></div>
            </form>
            {member.memberType !== "OWNER" && <form action={archiveMember} className="mt-3 border-t border-slate-200 pt-3 text-right dark:border-slate-700">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="memberId" value={member.id} />
              <button className="button-ghost text-red-700 dark:text-red-300">归档成员</button>
            </form>}
          </details>}
        </div>)}</div>

        {manageable && family.members.some((member) => member.deletedAt) && <details className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
          <summary className="cursor-pointer font-semibold text-muted">已归档成员（{family.members.filter((member) => member.deletedAt).length}）</summary>
          <div className="mt-3 space-y-2">{family.members.filter((member) => member.deletedAt).map((member) => <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100 p-3 dark:bg-slate-800" key={member.id}>
            <div><strong>{member.displayName}</strong><p className="text-sm text-muted">{member.memberType}</p></div>
            <form action={restoreMember}><input type="hidden" name="familyId" value={family.id} /><input type="hidden" name="memberId" value={member.id} /><button className="button-ghost">恢复成员</button></form>
          </div>)}</div>
        </details>}

        {manageable && <form action={createMember} className="mt-7 grid gap-3 border-t border-slate-200 pt-6 dark:border-slate-700 md:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="familyId" value={family.id}/>
          <input className="input mt-0" name="displayName" placeholder="成员姓名" required/>
          <input className="input mt-0" name="nickname" placeholder="昵称（可选）"/>
          <select className="input mt-0" name="memberType" defaultValue="LEARNER"><option value="PARENT">家长</option><option value="LEARNER">普通成员</option><option value="CHILD">学生/儿童</option></select>
          <select className="input mt-0" name="ageBand" defaultValue="ADULT"><option value="CHILD">儿童</option><option value="TEEN">青少年</option><option value="ADULT">成人</option><option value="SENIOR">长者</option></select>
          <div className="flex gap-2"><select className="input mt-0" name="dailyMinutes" defaultValue="20">{dailyOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select><button className="button-primary whitespace-nowrap">添加</button></div>
        </form>}
      </section>;
    })}</div>
  </div>;
}
