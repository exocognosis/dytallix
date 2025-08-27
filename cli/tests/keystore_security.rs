use dcli::keystore::{create_new, get_unlocked, purge, unlock};

#[test]
fn purge_works() {
    let dir = tempfile::tempdir().unwrap();
    let home = dir.path().to_str().unwrap();
    create_new(home, "alice", "pw").unwrap();
    unlock(home, "alice", "pw").unwrap();
    assert!(get_unlocked("alice").is_some());
    purge();
    assert!(get_unlocked("alice").is_none());
}
