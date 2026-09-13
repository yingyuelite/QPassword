// Standalone export wrapper for pbkdf2_sha256.
// Compiled freestanding (no libc). Reads password/salt from linear memory,
// writes dkLen bytes of derived key back to memory.
// Signature: (pwPtr, pwLen, saltPtr, saltLen, rounds, dkLen, dkPtr)
#include <stdint.h>
#include "pbkdf2_sha256.h"

__attribute__((export_name("pbkdf2_sha256")))
void wasm_pbkdf2_sha256(const uint8_t *pw, uint32_t pwLen,
                        const uint8_t *salt, uint32_t saltLen,
                        uint32_t rounds, uint32_t dkLen, uint8_t *dk)
{
	HMAC_SHA256_CTX hmac;
	pbkdf2_sha256(&hmac, pw, pwLen, salt, saltLen, rounds, dk, dkLen);
}