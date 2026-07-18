import { auth } from "@/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAccessContext } from "@/modules/authorization/context";
import { canManageFamily } from "@/modules/authorization/policy";
import { archiveMember, createFamily, createMember, restoreMember, updateFamily, updateMember } from "@/modules/family/actions";

const dailyOptions = [10, 15, 20, 30, 45, 60];
const vocabularyOptions = [1, 5, 8, 10, 15, 20, 30, 50, 100];

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await auth();
  const query = await searchParams;
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
  const t = english ? { title: "Families and members", help: "Family data is visible only to authorized members.", saved: "Member settings saved", profile: "Learning profile", preferences: "Learning preferences", first: "Create your first family", familyName: "Family name", timezone: "Time zone", myFamily: "My family", createFamily: "Create family", members: "members", editFamily: "Edit family information", saveFamily: "Save family information", perDay: "min/day", manager: "Management member", editMember: "Edit member", name: "Name", nickname: "Nickname", role: "Role", ownerLocked: "Role: Family owner (cannot be changed)", parent: "Parent", learner: "Member", child: "Student/child", age: "Age group", childAge: "Child", teen: "Teen", adult: "Adult", senior: "Senior", daily: "Daily study time", vocabularyGoal: "Suggested words per batch", goals: "Learning goals (comma separated)", interests: "Interests (comma separated)", weak: "Weak areas (comma separated)", save: "Save changes", archive: "Archive member", archived: "Archived members", restore: "Restore member", memberName: "Member name", optionalNickname: "Nickname (optional)", add: "Add" } : { title: "家庭与成员", help: "家庭数据仅对有权限的成员开放。", saved: "成员设置已保存", profile: "成员资料", preferences: "学习偏好", first: "创建第一个家庭", familyName: "家庭名称", timezone: "时区", myFamily: "我的家庭", createFamily: "创建家庭", members: "位成员", editFamily: "修改家庭信息", saveFamily: "保存家庭信息", perDay: "分钟/天", manager: "管理成员", editMember: "修改成员信息", name: "姓名", nickname: "昵称", role: "身份", ownerLocked: "身份：家庭所有者（不可更改）", parent: "家长", learner: "普通成员", child: "学生/儿童", age: "年龄段", childAge: "儿童", teen: "青少年", adult: "成人", senior: "长者", daily: "每日学习时间", vocabularyGoal: "每组建议单词数（不是上限）", goals: "学习目标（逗号分隔）", interests: "兴趣主题（逗号分隔）", weak: "薄弱项目（逗号分隔）", save: "保存修改", archive: "归档成员", archived: "已归档成员", restore: "恢复成员", memberName: "成员姓名", optionalNickname: "昵称（可选）", add: "添加" };

  return <div className="mx-auto max-w-6xl">
    <h1 className="text-4xl font-black">{t.title}</h1>
    <p className="mt-2 text-muted">{t.help}</p>
    {query.saved && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">✓ {t.saved}</div>}

    {!families.length && <form action={createFamily} className="card mt-8 max-w-xl">
      <h2 className="text-xl font-bold">{t.first}</h2>
      <label className="mt-5 block"><span className="label">{t.familyName}</span><input className="input" name="name" required defaultValue={t.myFamily} /></label>
      <label className="mt-4 block"><span className="label">{t.timezone}</span><input className="input" name="timezone" required defaultValue="America/Chicago" /></label>
      <button className="button-primary mt-5">{t.createFamily}</button>
    </form>}

    <div className="mt-8 space-y-6">{families.map((family) => {
      // Ownership is the source of truth. The role row is still used for
      // delegated managers, but a temporarily missing/stale role assignment
      // must never hide the owner's member-management controls.
      const manageable = family.ownerUserId === session!.user.id || canManageFamily(ctx, family.id);
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

        <div className="mt-6 grid gap-5 md:grid-cols-2">{family.members.filter((member) => !member.deletedAt).map((member) => <div className={`overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-slate-900 ${query.saved === member.id ? "border-emerald-400 ring-4 ring-emerald-100 dark:ring-emerald-950" : "border-slate-200 dark:border-slate-700"}`} key={member.id}>
          <div className="flex items-center gap-4 p-5"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 text-2xl font-black text-white">{member.displayName.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><strong className="block truncate text-xl">{member.displayName}</strong>{member.nickname && <span className="text-sm text-muted">{member.nickname}</span>}<p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand">{member.memberType}</p></div></div>
          {member.learnerProfile ? <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700"><Summary value={member.learnerProfile.cefrLevel?.replace("_", "-") ?? "—"} label={english ? "Level" : "等级"}/><Summary value={`${member.learnerProfile.dailyMinutes}`} label={t.perDay}/><Summary value={`${member.learnerProfile.dailyVocabularyGoal}`} label={english ? "words/batch" : "单词/组"}/></div> : <p className="border-t p-4 text-sm text-muted">{t.manager}</p>}

          {manageable && <details className="group border-t border-slate-200 dark:border-slate-700" open={query.saved === member.id}>
            <summary className="cursor-pointer list-none px-5 py-4 font-bold text-brand transition hover:bg-brand/5">✎ {t.editMember}<span className="float-right transition group-open:rotate-180">⌄</span></summary>
            <form action={updateMember} className="grid gap-4 bg-slate-50/80 p-5 dark:bg-slate-950/40 sm:grid-cols-2">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="memberId" value={member.id} />
              <h3 className="sm:col-span-2 text-xs font-black uppercase tracking-[.2em] text-muted">{t.profile}</h3>
              <label><span className="label">{t.name}</span><input className="input" name="displayName" required defaultValue={member.displayName} /></label>
              <label><span className="label">{t.nickname}</span><input className="input" name="nickname" defaultValue={member.nickname ?? ""} /></label>
              {member.memberType === "OWNER"
                ? <><input type="hidden" name="memberType" value="OWNER" /><p className="self-end rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">{t.ownerLocked}</p></>
                : <label><span className="label">{t.role}</span><select className="input" name="memberType" defaultValue={member.memberType}><option value="PARENT">{t.parent}</option><option value="LEARNER">{t.learner}</option><option value="CHILD">{t.child}</option></select></label>}
              {member.learnerProfile && <>
                <h3 className="mt-2 border-t border-slate-200 pt-5 text-xs font-black uppercase tracking-[.2em] text-muted dark:border-slate-700 sm:col-span-2">{t.preferences}</h3>
                <label><span className="label">{t.age}</span><select className="input" name="ageBand" defaultValue={member.learnerProfile.ageBand}><option value="CHILD">{t.childAge}</option><option value="TEEN">{t.teen}</option><option value="ADULT">{t.adult}</option><option value="SENIOR">{t.senior}</option></select></label>
                <label><span className="label">{t.daily}</span><select className="input" name="dailyMinutes" defaultValue={member.learnerProfile.dailyMinutes}>{dailyOptions.map((value) => <option value={value} key={value}>{value} {english ? "min" : "分钟"}</option>)}</select></label>
                <label><span className="label">{t.vocabularyGoal}</span><select className="input" name="dailyVocabularyGoal" defaultValue={member.learnerProfile.dailyVocabularyGoal}>{vocabularyOptions.map((value) => <option value={value} key={value}>{value} {english ? "words" : "个"}</option>)}</select></label>
                <label><span className="label">{t.goals}</span><input className="input" name="goals" defaultValue={member.learnerProfile.goals.join(english ? ", " : "，")}/></label>
                <label><span className="label">{t.interests}</span><input className="input" name="interests" defaultValue={member.learnerProfile.interests.join(english ? ", " : "，")}/></label>
                <label><span className="label">{t.weak}</span><input className="input" name="weakAreas" defaultValue={member.learnerProfile.weakAreas.join(english ? ", " : "，")}/></label>
              </>}
              <div className="flex items-end sm:col-span-2"><button className="button-primary w-full">{t.save}</button></div>
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
          <div className="flex gap-2"><select className="input mt-0" name="dailyMinutes" defaultValue="20" title={t.daily}>{dailyOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select><select className="input mt-0" name="dailyVocabularyGoal" defaultValue="10" title={t.vocabularyGoal}>{vocabularyOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select><button className="button-primary whitespace-nowrap">{t.add}</button></div>
        </form>}
      </section>;
    })}</div>
  </div>;
}

function Summary({ value, label }: { value: string; label: string }) { return <div className="bg-slate-50 px-3 py-4 text-center dark:bg-slate-800"><strong className="block text-lg">{value}</strong><span className="text-xs text-muted">{label}</span></div>; }
