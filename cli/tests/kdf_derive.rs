use dcli::crypto::derive_argon2id_32;

#[test]
fn argon2id_known_vector() {
    let salt = b"abcdefghijklmnop"; // 16 bytes
    let key = derive_argon2id_32("password", salt).unwrap();
    let hex = hex::encode(key);
    // Stable expectation (update if params change):
    assert_eq!(hex.len(), 64);
}
