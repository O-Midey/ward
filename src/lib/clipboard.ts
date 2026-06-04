// ============================================================
// Ward — Clipboard
// ============================================================
// Copy helper that clears the clipboard after a delay for
// sensitive values (addresses, recovery phrases). Best-effort:
// browsers don't let us verify clipboard contents without a
// permission prompt, so we simply overwrite after the window.

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function copyEphemeral(text: string, clearAfterMs = 30_000): Promise<void> {
  await navigator.clipboard.writeText(text);
  window.setTimeout(() => {
    // Overwrite with whitespace so the secret doesn't linger.
    navigator.clipboard.writeText(' ').catch(() => {});
  }, clearAfterMs);
}
