import { ChangePasswordForm } from "@/components/change-password-form";
export default function AccountPage(){return <div className="mx-auto max-w-5xl"><p className="font-bold text-brand">Account security</p><h1 className="mt-2 text-4xl font-black">账号安全</h1><p className="mt-2 text-muted">定期更换强密码；不要在聊天、日志或截图中发送密码。</p><ChangePasswordForm/></div>}
