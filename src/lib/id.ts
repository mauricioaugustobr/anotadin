/** Gera um ID único (hex aleatório, colisões desprezíveis para uso local). */
export function uid(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}
