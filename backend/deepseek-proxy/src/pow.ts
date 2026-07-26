/**
 * DeepSeek PoW (Proof of Work) Solver
 * 
 * Algorithm: SHA3-256 based hashcash
 * - Input = salt + "_" + expire_at + "_" + nonce + challenge
 * - Nonce starts as (expire_at - 60) as float64 string, incremented by 1
 * - Hash with SHA3-256, first `difficulty` bytes must be 0
 */

import { sha3_256 } from "@noble/hashes/sha3";

export interface PoWChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  signature: string;
  difficulty: number;
  expire_at: number;
  target_path: string;
}

export interface PoWSolution {
  algorithm: string;
  challenge: string;
  salt: string;
  answer: number;
  signature: string;
  target_path: string;
  pow_header: string;
}

function formatNonce(start: number, attempt: number): string {
  const nonce = start + attempt;
  return nonce.toFixed(1);
}

function computeHash(prefix: string, nonce: string, challenge: string): Uint8Array {
  const input = prefix + nonce + challenge;
  return sha3_256(new TextEncoder().encode(input));
}

function leadingZeroBytes(hash: Uint8Array, difficulty: number): boolean {
  for (let i = 0; i < difficulty && i < hash.length; i++) {
    if (hash[i] !== 0) return false;
  }
  return true;
}

function toBase64(json: object): string {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

export function solvePoW(challenge: PoWChallenge): PoWSolution | null {
  const prefix = challenge.salt + "_" + challenge.expire_at + "_";
  const startNonce = challenge.expire_at - 60;
  const maxAttempts = 10_000_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nonce = formatNonce(startNonce, attempt);
    const hash = computeHash(prefix, nonce, challenge.challenge);

    if (leadingZeroBytes(hash, challenge.difficulty)) {
      const answer = startNonce + attempt;
      const powHeader = toBase64({
        algorithm: challenge.algorithm,
        challenge: challenge.challenge,
        salt: challenge.salt,
        answer,
        signature: challenge.signature,
        target_path: challenge.target_path,
      });

      return {
        algorithm: challenge.algorithm,
        challenge: challenge.challenge,
        salt: challenge.salt,
        answer,
        signature: challenge.signature,
        target_path: challenge.target_path,
        pow_header: powHeader,
      };
    }
  }

  return null;
}

export async function getChallenge(baseURL: string, token: string, targetPath: string): Promise<PoWChallenge> {
  const resp = await fetch(`${baseURL}/api/v0/chat/create_pow_challenge`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "DeepSeek/2.0.4 Android/35",
    },
    body: JSON.stringify({ target_path: targetPath }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PoW challenge failed: ${resp.status} ${text}`);
  }

  const data: any = await resp.json();
  if (data.code !== 0 || !data.data?.biz_data?.challenge) {
    throw new Error(`PoW challenge error: code=${data.code}`);
  }

  const c = data.data.biz_data.challenge;
  return {
    algorithm: c.algorithm,
    challenge: c.challenge,
    salt: c.salt,
    signature: c.signature,
    difficulty: c.difficulty,
    expire_at: c.expire_at,
    target_path: c.target_path,
  };
}
