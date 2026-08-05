/**
 * 本地登录密码：salt + SHA-256 哈希（防明文落盘；非远程抗攻击方案）
 */

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(len = 16) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return bytesToHex(arr)
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(hash)
}

/**
 * @param {string} password
 * @param {string} salt
 */
export async function hashPassword(password, salt) {
  return sha256Hex(`${salt}:${password}`)
}

/**
 * @param {string} password
 * @returns {Promise<{ salt: string, hash: string, createdAt: string }>}
 */
export async function createPasswordRecord(password) {
  const salt = randomSalt()
  const hash = await hashPassword(password, salt)
  return {
    salt,
    hash,
    createdAt: new Date().toISOString()
  }
}

/**
 * @param {string} password
 * @param {{ salt: string, hash: string }} record
 */
export async function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false
  const h = await hashPassword(password, record.salt)
  return h === record.hash
}
