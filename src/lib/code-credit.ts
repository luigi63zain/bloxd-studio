export const CODE_CREDIT = "/* This code is made by BloxdStudio. Join at https://bloxd-studio.lovable.app — open Sign in to create an account. */";

/** A comment credits the tool without changing callbacks or broadcasting repeatedly. */
export function withCodeCredit(code: string): string {
  return code.startsWith(CODE_CREDIT) ? code : `${CODE_CREDIT}\n${code}`;
}