const levels=[
  {min:0,zh:"英语新手",en:"English Starter"},
  {min:200,zh:"坚持学员",en:"Consistent Learner"},
  {min:600,zh:"自信表达者",en:"Confident Speaker"},
  {min:1500,zh:"英语探索家",en:"English Explorer"},
  {min:3000,zh:"家庭英语达人",en:"Family English Champion"},
];
export function xpLevel(xp:number){const current=[...levels].reverse().find(level=>xp>=level.min)!;const next=levels.find(level=>level.min>xp);return{...current,nextMin:next?.min??null,progress:next?Math.round((xp-current.min)/(next.min-current.min)*100):100};}

