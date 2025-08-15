#include <stdint.h>
#include <stddef.h>
#include "api.h"

int pqc_keypair(unsigned char *pk, unsigned char *sk) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_crypto_sign_keypair(pk, sk); }
int pqc_sign(unsigned char *sig, size_t *siglen, const unsigned char *m, size_t mlen, const unsigned char *sk) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_crypto_sign_signature(sig, siglen, m, mlen, sk); }
int pqc_verify(const unsigned char *sig, size_t siglen, const unsigned char *m, size_t mlen, const unsigned char *pk) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_crypto_sign_verify(sig, siglen, m, mlen, pk); }
int pqc_pk_bytes(void) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_CRYPTO_PUBLICKEYBYTES; }
int pqc_sk_bytes(void) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_CRYPTO_SECRETKEYBYTES; }
int pqc_sig_bytes(void) { return PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN_CRYPTO_BYTES; }
