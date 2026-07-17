import { auth } from "@/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { archiveMember, createFamily, createMember, restoreMember, updateFamily, updateMember } from "@/modules/family/actions";

const dailyOptions = [10, 15, 20, 30, 45, 60];

export default async function FamilyPage() {
  const session = await auth();
  const english = (await cookies()).get("ui_locale")?.value === "en";
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
  const t = english ? { title: "Families and members", help: "Family data is visible only to authorized members.", first: "Create your first family", familyName: "Family name", timezone: "Time zone", myFamily: "My family", createFamily: "Create family", members: "members", editFamily: "Edit family information", saveFamily: "Save family information", perDay: "min/day", manager: "Management member", editMember: "Edit member", name: "Name", nickname: "Nickname", role: "Role", ownerLocked: "Role: Family owner (cannot be changed)", parent: "Parent", learner: "Member", child: "Student/child", age: "Age group", childAge: "Child", teen: "Teen", adult: "Adult", senior: "Senior", daily: "Daily study time", goals: "Learning goals (comma separated)", interests: "Interests (comma separated)", weak: "Weak areas (comma separated)", save: "Save changes", archive: "Archive member", archived: "Archived members", restore: "Restore member", memberName: "Member name", optionalNickname: "Nickname (optional)", add: "Add" } : { title: "家庭与成员", help: "家庭数据仅对有权限的成员开放。", first: "创建第一个家庭", familyName: "家庭名称", timezone: "时区", myFamily: "我的家庭", createFamily: "创建家庭", members: "位成员", editFamily: "修改家庭信息", saveFamily: "保存家庭信息", perDay: "分钟/天", manager: "管理成员", editMember: "修改成员信息", name: "姓名", nickname: "昵称", role: "身份", ownerLocked: "身份：家庭所有者（不可更改）", parent: "家长", learner: "普通成员", child: "学生/儿童", age: "年龄段", childAge: "儿童", teen: "青少年", adult: "成人", senior: "长者", daily: "每日学习时间", goals: "学习目标（逗号分隔）", interests: "兴趣主题（逗号分隔）", weak: "薄弱项目（逗号分隔）", save: "保存修改", archive: "归档成员", archived: "已归档成员", restore: "恢复成员", memberName: "成员姓名", optionalNickname: "昵称（可选）", add: "添加" };

  return <div className="mx-auto max-w-6xl">
    <h1 className="text-4xl font-black">{t.title}</h1>
    <p className="mt-2 text-muted">{t.help}</p>

    {!families.length && <form action={createFamily} className="card mt-8 max-w-xl">
      <h2 className="text-xl font-bold">{t.first}</h2>
      <label className="mt-5 block"><span className="label">{t.familyName}</span><input className="input" name="name" required defaultValue={t.myFamily} /></label>
      <label className="mt-4 block"><span className="label">{t.timezone}</span><input className="input" name="timezone" required defaultValue="America/Chicago" /></label>
      <button className="button-primary mt-5">{t.createFamily}</button>
    </form>}

    <div className="mt-8 space-y-6">{families.map((family) => {
      const manageable = canManageFamily(ctx, family.id);
      return <section className="card" key={family.id}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-2xl font-bold">{family.name}</h2><p className="text-sm text-muted">{family.timezone} · {family.members.filter((member) => !member.deletedAt).length} {t.members}</p></div>
        </div>

        {manageable && <details className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <summary className="cursor-pointer font-semibold text-brand">{t.editFamily}</summary>
          <form action={updateFamily} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="familyId" value={family.id} />
            <label><span className="label">{t.familyName}</span><input className="input" name="name" required defaultValue={family.name} /></label>
            <label><span className="label">{t.timezone}</span><input className="input" name="timezone" required defaultValue={family.timezone} /></label>
            <div className="flex items-end"><button className="button-primary">{t.saveFamily}</button></div>
          </form>
        </details>}

        <div className="mt-6 grid gap-3 md:grid-cols-2">{family.members.filter((member) => !member.deletedAt).map((member) => <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" key={member.id}>
          <strong>{member.displayName}</strong>{member.nickname && <span className="ml-2 text-muted">({member.nickname})</span>}
          <p className="mt-1 text-sm text-muted">{member.memberType} · {member.learnerProfile ? `${member.learnerProfile.dailyMinutes} ${t.perDay}` : t.manager}</p>

          {manageable && <details className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <summary className="cursor-pointer font-semibold text-brand">{t.editMember}</summary>
            <form action={updateMember} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="memberId" value={member.id} />
              <label><span className="label">{t.name}</span><input className="input" name="displayName" required defaultValue={member.displayName} /></label>
              <label><span className="label">{t.nickname}</span><input className="input" name="nickname" defaultValue={member.nickname ?? ""} /></label>
              {member.memberType === "OWNER"
                ? <><input type="hidden" name="memberType" value="OWNER" /><p className="self-end rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">{t.ownerLocked}</p></>
                : <label><span className="label">{t.role}</span><select className="input" name="memberType" defaultValue={member.memberType}><option value="PARENT">{t.parent}</option><option value="LEARNER">{t.learner}</option><option value="CHILD">{t.child}</option></select></label>}
              {member.learnerProfile && <>
                <label><span className="label">{t.age}</span><select className="input" name="ageBand" defaultValue={member.learnerProfile.ageBand}><option value="CHILD">{t.childAge}</option><option value="TEEN">{t.teen}</option><option value="ADULT">{t.adult}</option><option value="SENIOR">{t.senior}</option></select></label>
                <label><span className="label">{t.daily}</span><select className="input" name="dailyMinutes" defaultValue={member.learnerProfile.dailyMinutes}>{dailyOptions.map((value) => <option value={value} key={value}>{value} {english ? "min" : "分钟"}</option>)}</select></label>
                <label><span className="label">{t.goals}</span><input className="input" name="goals" defaultValue={member.learnerProfile.goals.join(english ? ", " : "，")}/></label>
                <label><span className="label">{t.interests}</span><input className="input" name="interests" defaultValue={member.learnerProfile.interests.join(english ? ", " : "，")}/></label>
                <label><span className="label">{t.weak}</span><input className="input" name="weakAreas" defaultValue={member.learnerProfile.weakAreas.join(english ? ", " : "，")}/></label>
              </>}
              <div className="flex items-end"><button className="button-primary w-full">{t.save}</button></div>
            </form>
            {member.memberType !== "OWNER" && <form action={archiveMember} className="mt-3 border-t border-slate-200 pt-3 text-right dark:border-slate-700">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="memberId" value={member.id} />
              <button className="button-ghost text-red-700 dark:text-red-300">{t.archive}</button>
            </form>}
          </details>}
        </div>)}</div>

        {manageable && family.members.some((member) => member.deletedAt) && <details className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
          <summary className="cursor-pointer font-semibold text-muted">{t.archived} ({family.members.filter((member) => member.deletedAt).length})</summary>
          <div className="mt-3 space-y-2">{family.members.filter((member) => member.deletedAt).map((member) => <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-100 p-3 dark:bg-slate-800" key={member.id}>
            <div><strong>{member.displayName}</strong><p className="text-sm text-muted">{member.memberType}</p></div>
            <form action={restoreMember}><input type="hidden" name="familyId" value={family.id} /><input type="hidden" name="memberId" value={member.id} /><button className="button-ghost">{t.restore}</button></form>
          </div>)}</div>
        </details>}

        {manageable && <form action={createMember} className="mt-7 grid gap-3 border-t border-slate-200 pt-6 dark:border-slate-700 md:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="familyId" value={family.id}/>
          <input className="input mt-0" name="displayName" placeholder={t.memberName} required/>
          <input className="input mt-0" name="nickname" placeholder={t.optionalNickname}/>
          <select className="input mt-0" name="memberType" defaultValue="LEARNER"><option value="PARENT">{t.parent}</option><option value="LEARNER">{t.learner}</option><option value="CHILD">{t.child}</option></select>
          <select className="input mt-0" name="ageBand" defaultValue="ADULT"><option value="CHILD">{t.childAge}</option><option value="TEEN">{t.teen}</option><option value="ADULT">{t.adult}</option><option value="SENIOR">{t.senior}</option></select>
          <div className="flex gap-2"><select className="input mt-0" name="dailyMinutes" defaultValue="20">{dailyOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select><button className="button-primary whitespace-nowrap">{t.add}</button></div>
        </form>}
      </section>;
    })}</div>
  </div>;
}
