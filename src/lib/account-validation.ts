const USERNAME_MIN_LENGTH = 2;
const PASSWORD_MIN_LENGTH = 4;

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function validateUsername(username: string) {
  if (!username) return "用户名不能为空";
  if (username.length < USERNAME_MIN_LENGTH) {
    return `用户名至少 ${USERNAME_MIN_LENGTH} 个字符`;
  }
  return null;
}

export function validatePassword(password: string, label = "密码") {
  if (!password) return `${label}不能为空`;
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${label}至少 ${PASSWORD_MIN_LENGTH} 位`;
  }
  return null;
}
