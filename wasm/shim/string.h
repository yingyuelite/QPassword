#ifndef SHIM_STRING_H
#define SHIM_STRING_H
#include <stddef.h>
#define NULL ((void*)0)
void *memcpy(void *d, const void *s, size_t n);
void *memset(void *s, int c, size_t n);
int memcmp(const void *a, const void *b, size_t n);
#endif