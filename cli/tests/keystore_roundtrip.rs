use dyt::keystore;

#[test]
fn keystore_roundtrip_change_password() {
    let dir = tempfile::tempdir().unwrap();
    let home = dir.path().to_str().unwrap();
    let e = keystore::create_new(home, "test", "pw1").unwrap();
    let list = keystore::list(home).unwrap();
    assert_eq!(list.len(), 1);
    let u = keystore::unlock(home, "test", "pw1").unwrap();
    assert_eq!(u.address, e.address);
    keystore::change_password(home, "test", "pw1", "pw2").unwrap();
    let u2 = keystore::unlock(home, "test", "pw2").unwrap();
    assert_eq!(u2.address, e.address);
}
